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

    // ─────────────────────────────────────────────────────────────────
    // POST /api/job-postings/{postingId}/applications
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public JobApplicationResponse apply(Long postingId, Long applicantUserId, JobApplicationCreateRequest request) {
        checkBillingEligibility(postingId);

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
        JobApplication application = jobApplicationRepository.findById(applicationId)
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

        if (accept) {
            application.accept();
        } else {
            application.decline();
        }
        application = jobApplicationRepository.save(application);

        notificationService.notifyJobApplicationResponded(
                application.getApplicantUser().getId(), application.getPosting().getStore().getStoreName(), accept);

        return toListItem(application);
    }

    // ─────────────────────────────────────────────────────────────────
    // 과금 훅(§2 #12, Phase 8 대상)
    // ─────────────────────────────────────────────────────────────────

    /** v1은 항상 통과 — 실제 과금 판정은 Phase 8에서 구현한다. */
    private void checkBillingEligibility(Long postingId) {
        // v1: no-op.
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
