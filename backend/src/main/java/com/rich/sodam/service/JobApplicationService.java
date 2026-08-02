package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.JobApplication;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.JobResponseStatus;
import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.response.JobApplicantListItemResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.dto.response.JobSeekingProfileResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.JobApplicationRepository;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.ZoneId;
import java.util.List;

/**
 * 구인 공고 지원(JobApplication) 서비스 — 지원/조회/응답(260711_작업통합.md Part 2 §19.3, Phase 5).
 * {@link JobOfferService}(§15, 사장→직원)의 역방향(직원→사장)이다.
 *
 * <p><b>공고 OFF 시 대기중 지원의 lazy EXPIRED</b>(§19.2, §10 Phase 5 리스크 5): 배치 없이 조회/응답
 * 시점에 "현재 공고가 open 인가"를 기준으로 판정한다. {@link #effectiveStatus} 하나가 리스트(내
 * 지원 현황/매장 지원자 리스트)·응답(respond) 전 경로가 공유하는 유일한 판정 지점이다(중복 구현 금지
 * 원칙).</p>
 *
 * <p><b>타 매장 지원자 응답 403</b>: {@code respond} 엔드포인트는 경로에 storeId 가 없어(스펙상
 * {@code PUT /api/job-applications/{id}/respond}) 컨트롤러에서 {@link StoreAccessGuard} 를 storeId
 * 로 미리 걸 수 없다. 대신 지원 건을 먼저 로드해 그 공고가 속한 매장을 사장이 실제로 소유하는지
 * {@link MasterStoreRelationRepository} 로 직접 검증한다(StoreAccessGuard 클래스 자체는 수정하지
 * 않고, 그 내부와 동일한 조회를 재사용).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JobApplicationService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final JobApplicationRepository jobApplicationRepository;
    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final EmployeeStoreRelationRepository employeeStoreRelationRepository;
    private final NotificationService notificationService;
    private final AttendanceCreditService attendanceCreditService;
    private final RecruitmentBoostPassService recruitmentBoostPassService;
    private final ChatRoomService chatRoomService;

    // ─────────────────────────────────────────────────────────────────
    // POST /api/job-postings/{postingId}/applications
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobApplicationResponse apply(Long postingId, Long applicantUserId, JobApplicationCreateRequest request) {
        JobPosting posting = jobPostingRepository.findById(postingId)
                .orElseThrow(() -> new EntityNotFoundException("JobPosting", postingId));
        User applicant = userRepository.findById(applicantUserId)
                .orElseThrow(() -> new EntityNotFoundException("User", applicantUserId));

        if (!attendanceRepository.existsByEmployeeProfile_Id(applicantUserId)) {
            throw new BusinessException("소담으로 출퇴근한 이력이 있어야 지원할 수 있어요.", "JOB_APPLICATION_NOT_ELIGIBLE");
        }
        if (!posting.isOpen()) {
            throw new BusinessException("마감된 공고예요.", "POSTING_CLOSED");
        }

        rejectIfActivePending(postingId, applicantUserId);

        String message = request == null ? null : request.message();
        JobApplication application = JobApplication.apply(posting, applicant, message);
        try {
            application = jobApplicationRepository.save(application);
        } catch (DataIntegrityViolationException e) {
            log.info("JobApplication 동시 중복 PENDING 방지 — postingId={} applicantUserId={}", postingId, applicantUserId);
            throw new ConflictException("이미 지원했어요.", "APPLICATION_ALREADY_PENDING");
        }

        Long ownerUserId = resolveStoreOwnerUserId(posting.getStore().getId());
        if (ownerUserId != null) {
            notificationService.notifyJobApplicationReceived(ownerUserId, applicant.getName(), posting.getStore().getStoreName());
        }

        return toResponse(application);
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/job-applications/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getMyApplications(Long userId) {
        return jobApplicationRepository.findByApplicantUser_IdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/stores/{storeId}/job-applications
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobApplicantListItemResponse> getApplicationsForStore(Long storeId) {
        // 아직 공고를 올린 적 없는 매장은 정상 상태(빈 지원자 목록)다 — 404 로 취급하지 않는다
        // (Phase 7 E2E 검증에서 발견: 신규 매장의 "우리 공고·지원자" 탭이 항상 에러 화면으로 떨어지던 버그).
        return jobPostingRepository.findByStore_Id(storeId)
                .map(posting -> jobApplicationRepository.findByPosting_IdOrderByCreatedAtDesc(posting.getId()).stream()
                        .map(this::toListItem)
                        .toList())
                .orElseGet(List::of);
    }

    // ─────────────────────────────────────────────────────────────────
    // PUT /api/job-applications/{id}/respond
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobApplicantListItemResponse respondToApplication(Long applicationId, Long masterId, boolean accept) {
        JobApplication application = jobApplicationRepository.findByIdForUpdate(applicationId)
                .orElseThrow(() -> new EntityNotFoundException("JobApplication", applicationId));

        Long storeId = application.getPosting().getStore().getId();
        if (!masterStoreRelationRepository.existsByMasterProfile_IdAndStore_Id(masterId, storeId)) {
            log.warn("권한 거부: master {} 가 application {} 의 매장을 소유하지 않음", masterId, applicationId);
            throw new AccessDeniedException("해당 매장의 지원 건이 아니에요.");
        }

        if (effectiveStatus(application) != JobResponseStatus.PENDING) {
            if (application.isPending()) {
                application.expire();
            }
            throw new ConflictException("이미 응답했거나 마감된 지원이에요.", "APPLICATION_NOT_PENDING");
        }

        checkBillingEligibility(masterId);

        if (accept) {
            application.accept();
        } else {
            application.decline();
        }
        application = jobApplicationRepository.save(application);

        notificationService.notifyJobApplicationResponded(
                application.getApplicantUser().getId(), application.getPosting().getStore().getStoreName(), accept);

        // 채팅방 개설(§4.5) — 구직자가 먼저 지원해 접촉에 동의한 방향이라, 사장이 "열람"하는 이 응답
        // 시점(수락/거절 무관)에 연다 — §2.3 과금이 수락 여부와 무관하게 "열람" 행위 자체에 걸리는 것과
        // 동일한 근거다(ChatRoom 클래스 javadoc §개설 트리거 참고).
        chatRoomService.openForApplicationResponded(application, masterId);

        return toListItem(application);
    }

    // ─────────────────────────────────────────────────────────────────
    // 과금 훅(recruitment-monetization-gamification-plan.md §2.3, §7 Phase A)
    // ─────────────────────────────────────────────────────────────────

    /**
     * 지원서 열람+채팅방 개설 시 출근권 2개를 소모한다(§2.3). 잔액 부족 시
     * {@link com.rich.sodam.exception.InsufficientCreditException}(402)을 던진다.
     *
     * <p><b>호출 지점을 {@code apply()}가 아닌 {@code respondToApplication()}으로 둔 이유</b>:
     * 이 과금 자리는 원래(260711_작업통합.md Part 2 §2 #12) {@code apply()}(직원의 지원 제출)에
     * no-op 스텁으로 배치돼 있었다. 하지만 §2.3의 실제 과금 대상은 "사장이 지원서를 열람하고
     * 채팅방을 여는 행위"이며, 구직자는 완전 무과금 원칙(§2.3 "구직자는 여전히 완전
     * 무과금")이 지켜져야 한다 — {@code apply()}에 그대로 연결하면 사장의 잔액 부족이 직원의
     * 지원 자체를 막아버려 이 원칙을 정면으로 위반한다. Phase D(채팅) 이전인 현재 코드베이스에는
     * "지원서 상세 열람" 전용 엔드포인트가 따로 없고, 사장이 개별 지원 건에 대해 취하는 유일한
     * 능동적 행위가 {@link #respondToApplication}(수락/거절)이므로 이 시점(응답 1회당, PENDING
     * 재응답 방지 가드 덕에 지원 건당 정확히 1회)에 소모하도록 배선했다. 수락뿐 아니라 거절에도
     * 부과하는 이유는 §2.3이 "열람"에 과금하는 것이지 "수락 여부"에 과금하는 게 아니기 때문이다
     * (거절하려면 어차피 지원 내용을 열람해야 한다). Phase D에서 별도의 "지원서 상세 열람" 액션이
     * 생기면 이 호출 지점을 그쪽으로 옮기는 재검토가 필요하다.</p>
     *
     * <p><b>무제한 패스 우회</b>(§2.5): 출근권 소모 전에 이 사장이 활성 무제한 패스를 보유했는지 먼저
     * 확인한다 — 보유 중이면 {@link AttendanceCreditService} 호출 자체를 건너뛰어 잔액을 전혀
     * 건드리지 않는다(0개 소모).</p>
     */
    private void checkBillingEligibility(Long masterId) {
        if (recruitmentBoostPassService.hasActivePass(masterId)) {
            return;
        }
        attendanceCreditService.consumeForApplicationViewChatOpen(masterId);
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 헬퍼
    // ─────────────────────────────────────────────────────────────────

    /**
     * 동시 중복 PENDING 사전 방어(이중 방어 앞단, §10 Phase 5 리스크 3). 발견한 기존 PENDING 이
     * lazy 판정상 이미 EXPIRED(공고 OFF)라면 그 자리에서 만료 처리 후 즉시 flush 하여 dedup 키를
     * 비운다 — 뒤이은 insert 와의 flush 순서 충돌을 피하기 위함(JobOfferService 와 동일 패턴).
     */
    private void rejectIfActivePending(Long postingId, Long applicantUserId) {
        jobApplicationRepository.findByPosting_IdAndApplicantUser_IdAndStatus(
                        postingId, applicantUserId, JobResponseStatus.PENDING)
                .ifPresent(existing -> {
                    if (effectiveStatus(existing) == JobResponseStatus.EXPIRED) {
                        existing.expire();
                        jobApplicationRepository.saveAndFlush(existing);
                    } else {
                        throw new ConflictException("이미 지원했어요.", "APPLICATION_ALREADY_PENDING");
                    }
                });
    }

    /**
     * 공고 OFF 시 대기중 지원의 lazy EXPIRED 판정 — 이 서비스의 모든 조회/응답 경로가 공유하는
     * 유일한 헬퍼(§10 Phase 5 리스크 5, 중복 구현 금지). 조회 경로에서는 DB 를 쓰지 않고 응답용
     * 유효 상태만 계산한다.
     */
    private JobResponseStatus effectiveStatus(JobApplication application) {
        if (application.isPending() && !application.getPosting().isOpen()) {
            return JobResponseStatus.EXPIRED;
        }
        return application.getStatus();
    }

    private Long resolveStoreOwnerUserId(Long storeId) {
        return masterStoreRelationRepository.findByStore_Id(storeId).stream()
                .findFirst()
                .map(rel -> rel.getMasterProfile().getId())
                .orElse(null);
    }

    private JobApplicationResponse toResponse(JobApplication application) {
        JobPosting posting = application.getPosting();
        JobResponseStatus effective = effectiveStatus(application);
        String storeCode = effective == JobResponseStatus.ACCEPTED ? posting.getStore().getStoreCode() : null;
        return new JobApplicationResponse(
                application.getId(),
                posting.getId(),
                posting.getStore().getId(),
                posting.getStore().getStoreName(),
                posting.getWorkType().name(),
                posting.getJobCategory().name(),
                posting.getWorkDate(),
                posting.getStartTime(),
                posting.getEndTime(),
                posting.getHourlyWage(),
                application.getMessage(),
                effective.name(),
                application.getCreatedAt(),
                application.getRespondedAt(),
                storeCode);
    }

    private JobApplicantListItemResponse toListItem(JobApplication application) {
        User applicant = application.getApplicantUser();
        JobResponseStatus effective = effectiveStatus(application);
        return new JobApplicantListItemResponse(
                application.getId(),
                applicant.getId(),
                applicant.getName(),
                calculateAge(applicant.getBirthDate()),
                resolveCurrentEmployment(applicant.getId()),
                application.getMessage(),
                effective.name(),
                application.getCreatedAt(),
                application.getRespondedAt());
    }

    private JobSeekingProfileResponse.CurrentEmployment resolveCurrentEmployment(Long userId) {
        List<EmployeeStoreRelation> active = employeeStoreRelationRepository.findActiveByEmployeeIdWithStore(userId);
        if (active.isEmpty()) {
            return null;
        }
        EmployeeStoreRelation relation = active.get(0);
        return new JobSeekingProfileResponse.CurrentEmployment(relation.getStore().getStoreName(), relation.getHireDate());
    }

    private Integer calculateAge(LocalDate birthDate) {
        if (birthDate == null) {
            return null;
        }
        return Period.between(birthDate, LocalDate.now(SEOUL)).getYears();
    }
}
