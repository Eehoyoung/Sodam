package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.AttendanceCreditTransaction;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.RecruitmentBoostPass;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.JobApplicantListItemResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.InsufficientCreditException;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceCreditTransactionRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobApplicationRepository;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.RecruitmentBoostPassRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 구인 공고 지원(JobApplication) 서비스 테스트 — 자격/중복/마감/PII/lazy 만료/권한
 * (260711_작업통합.md Part 2 §19.5).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobApplicationServiceTest {

    @Autowired private JobApplicationService applicationService;
    @Autowired private JobPostingService postingService;
    @Autowired private JobApplicationRepository jobApplicationRepo;
    @Autowired private JobPostingRepository jobPostingRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private AttendanceCreditRepository attendanceCreditRepo;
    @Autowired private AttendanceCreditTransactionRepository attendanceCreditTransactionRepo;
    @Autowired private RecruitmentBoostPassRepository recruitmentBoostPassRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("app_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User applicantUser() {
        User u = new User("app_applicant" + (emailSeq++) + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_510_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("지원테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        s = storeRepo.save(s);
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        grantAttendanceCredits(owner, 1_000);
        return s;
    }

    /**
     * 출근권 잔액을 임의 값으로 맞춘다(멱등 — 지갑이 없으면 생성, 있으면 덮어씀). 기본
     * {@link #store}는 넉넉한 잔액(1000)을 미리 채워두므로, 부족 시나리오 테스트는 이 메서드로
     * 같은 지갑의 잔액을 덮어써야 한다(새 지갑을 또 만들면 owner당 유니크 제약 위반).
     *
     * <p>실제 소모(consume)는 잔액 컬럼이 아니라 원장 lot(remainingQuantity)에서 FIFO로 끌어온다
     * ({@code AttendanceCreditService} 설계 노트 참고) — 테스트에서 잔액 컬럼만 바꾸면 lot이 없어
     * "정합성 오류"(IllegalStateException)가 난다. 테스트 전용 무기한 TOPUP lot 1건을 항상 이 값과
     * 맞춰 함께 갱신한다(기존 lot은 먼저 비운다).
     */
    private void grantAttendanceCredits(User owner, int amount) {
        AttendanceCredit wallet = attendanceCreditRepo.findByOwnerUserId(owner.getId())
                .orElseGet(() -> attendanceCreditRepo.save(AttendanceCredit.openFor(owner.getId())));
        ReflectionTestUtils.setField(wallet, "balance", amount);
        attendanceCreditRepo.save(wallet);

        attendanceCreditTransactionRepo.findAll().stream()
                .filter(t -> t.getOwnerUserId().equals(owner.getId())
                        && t.getType() == AttendanceCreditTransactionType.TOPUP
                        && t.getRemainingQuantity() != null && t.getRemainingQuantity() > 0)
                .forEach(lot -> {
                    lot.drawDown(lot.getRemainingQuantity());
                    attendanceCreditTransactionRepo.save(lot);
                });
        if (amount > 0) {
            attendanceCreditTransactionRepo.save(AttendanceCreditTransaction.supply(owner.getId(),
                    AttendanceCreditTransactionType.TOPUP, AttendanceCreditTransactionReason.IAP_TOPUP,
                    amount, null, LocalDateTime.now()));
        }
    }

    /** 사장에게 활성 무제한 패스를 부여한다(과금 우회 시나리오 재현용, §2.5). */
    private void activateBoostPass(User owner, int daysFromNow) {
        RecruitmentBoostPass pass = recruitmentBoostPassRepo.findByOwnerUserId(owner.getId())
                .orElseGet(() -> recruitmentBoostPassRepo.save(RecruitmentBoostPass.openFor(owner.getId())));
        pass.extend(LocalDateTime.now(), daysFromNow);
        recruitmentBoostPassRepo.saveAndFlush(pass);
    }

    /** 무제한 패스를 만료 상태로 되돌린다(패스 만료 후 재소모 검증용). */
    private void expireBoostPass(User owner) {
        RecruitmentBoostPass pass = recruitmentBoostPassRepo.findByOwnerUserId(owner.getId()).orElseThrow();
        ReflectionTestUtils.setField(pass, "activeUntil", LocalDateTime.now().minusDays(1));
        recruitmentBoostPassRepo.saveAndFlush(pass);
    }

    private JobPosting posting(Store store, boolean open) {
        postingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", open));
        return jobPostingRepo.findByStore_Id(store.getId()).orElseThrow();
    }

    private void grantEligibility(User u, Store store) {
        EmployeeProfile emp = employeeProfileRepo.save(new EmployeeProfile(u));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    private String errorCode(Throwable t) {
        return ((BusinessException) t).getErrorCode();
    }

    // ─────────────────────────────────────────────────────────────────
    // 지원 — 자격/마감/중복
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("정상 지원 — PENDING 생성, storeCode 미포함")
    void apply_success() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        JobApplicationResponse resp = applicationService.apply(p.getId(), applicant.getId(),
                new JobApplicationCreateRequest("잘 부탁드려요"));

        assertThat(resp.status()).isEqualTo("PENDING");
        assertThat(resp.storeCode()).isNull();
        assertThat(jobApplicationRepo.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("출퇴근 이력 없는 지원자 → JOB_APPLICATION_NOT_ELIGIBLE 400")
    void apply_withoutEligibility_throws() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        // grantEligibility 호출 없음

        assertThatThrownBy(() -> applicationService.apply(p.getId(), applicant.getId(), null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("JOB_APPLICATION_NOT_ELIGIBLE"));
    }

    @Test
    @DisplayName("마감된 공고에 지원 → POSTING_CLOSED 400")
    void apply_closedPosting_throws() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, false);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        assertThatThrownBy(() -> applicationService.apply(p.getId(), applicant.getId(), null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("POSTING_CLOSED"));
    }

    @Test
    @DisplayName("같은 공고에 중복 지원(대기중) → APPLICATION_ALREADY_PENDING 409")
    void apply_duplicatePending_throws() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        applicationService.apply(p.getId(), applicant.getId(), null);

        assertThatThrownBy(() -> applicationService.apply(p.getId(), applicant.getId(), null))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("APPLICATION_ALREADY_PENDING"));
    }

    @Test
    @DisplayName("거절 후에는 같은 공고에 재지원이 가능하다")
    void apply_afterDecline_allowsReapply() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        JobApplicationResponse first = applicationService.apply(p.getId(), applicant.getId(), null);
        applicationService.respondToApplication(first.id(), owner.getId(), false);

        JobApplicationResponse second = applicationService.apply(p.getId(), applicant.getId(), null);
        assertThat(second.status()).isEqualTo("PENDING");
    }

    // ─────────────────────────────────────────────────────────────────
    // 응답 — 수락/거절/PII/권한
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("수락 전 내 지원 현황엔 storeCode 없음, 수락 후엔 포함")
    void respondToApplication_accept_exposesStoreCodeOnlyAfter() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        List<JobApplicationResponse> beforeList = applicationService.getMyApplications(applicant.getId());
        assertThat(beforeList.get(0).storeCode()).isNull();

        applicationService.respondToApplication(created.id(), owner.getId(), true);

        List<JobApplicationResponse> afterList = applicationService.getMyApplications(applicant.getId());
        assertThat(afterList.get(0).status()).isEqualTo("ACCEPTED");
        assertThat(afterList.get(0).storeCode()).isEqualTo(store.getStoreCode());
    }

    @Test
    @DisplayName("거절 응답 — status=DECLINED")
    void respondToApplication_decline() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        JobApplicantListItemResponse responded = applicationService.respondToApplication(created.id(), owner.getId(), false);

        assertThat(responded.status()).isEqualTo("DECLINED");
    }

    @Test
    @DisplayName("타 매장 사장이 응답 시도 → AccessDeniedException(403)")
    void respondToApplication_wrongStoreOwner_throwsAccessDenied() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);

        User otherOwner = masterUser();
        store(otherOwner); // 다른 매장 소유

        assertThatThrownBy(() -> applicationService.respondToApplication(created.id(), otherOwner.getId(), true))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("이미 응답한 지원에 재응답 → APPLICATION_NOT_PENDING 409")
    void respondToApplication_alreadyResponded_throws() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        applicationService.respondToApplication(created.id(), owner.getId(), true);

        assertThatThrownBy(() -> applicationService.respondToApplication(created.id(), owner.getId(), false))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("APPLICATION_NOT_PENDING"));
    }

    // ─────────────────────────────────────────────────────────────────
    // 공고 OFF → 대기중 지원 lazy EXPIRED
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("공고 OFF 전환 후 대기중 지원 조회 → 응답상 EXPIRED (lazy, DB 는 PENDING 유지)")
    void posting_closed_showsPendingApplicationAsExpired() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);

        // 공고 OFF 전환
        postingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "마감", false));

        List<JobApplicationResponse> myList = applicationService.getMyApplications(applicant.getId());
        assertThat(myList.get(0).status()).isEqualTo("EXPIRED");

        List<JobApplicantListItemResponse> storeList = applicationService.getApplicationsForStore(store.getId());
        assertThat(storeList.get(0).status()).isEqualTo("EXPIRED");

        assertThat(jobApplicationRepo.findById(created.id()).orElseThrow().getStatus().name()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("공고 OFF 이후 대기중 지원에 응답 시도 → APPLICATION_NOT_PENDING 409")
    void respondToApplication_afterPostingClosed_throwsNotPending() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);

        postingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "마감", false));

        assertThatThrownBy(() -> applicationService.respondToApplication(created.id(), owner.getId(), true))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(errorCode(e)).isEqualTo("APPLICATION_NOT_PENDING"));
    }

    // ─────────────────────────────────────────────────────────────────
    // 공고를 아직 올린 적 없는 매장 — 지원자 리스트는 빈 목록이어야 함(회귀 테스트)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("공고를 아직 올린 적 없는 매장의 지원자 리스트 조회 → 빈 목록(404 아님, Phase 7 E2E에서 발견)")
    void getApplicationsForStore_noPostingYet_returnsEmptyList() {
        User owner = masterUser();
        Store store = store(owner);

        List<JobApplicantListItemResponse> storeList = applicationService.getApplicationsForStore(store.getId());

        assertThat(storeList).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────
    // 과금 연동 — 출근권 잔액 부족 시 402 (recruitment-monetization-gamification-plan.md §2.3)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("사장 출근권 잔액 부족 → 응답(수락) 시 InsufficientCreditException(402), 상태·잔액 모두 변경 없음")
    void respondToApplication_insufficientCredit_throws() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        grantAttendanceCredits(owner, 1); // 필요한 2개보다 적게(기본 store() 는 1000을 채워둠)

        assertThatThrownBy(() -> applicationService.respondToApplication(created.id(), owner.getId(), true))
                .isInstanceOf(InsufficientCreditException.class)
                .satisfies(e -> {
                    InsufficientCreditException ex = (InsufficientCreditException) e;
                    assertThat(ex.getRequired()).isEqualTo(2);
                    assertThat(ex.getBalance()).isEqualTo(1);
                });

        assertThat(jobApplicationRepo.findById(created.id()).orElseThrow().getStatus().name()).isEqualTo("PENDING");
        assertThat(attendanceCreditRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isEqualTo(1);
    }

    @Test
    @DisplayName("정확히 2개 남은 상태에서 거절 응답 → 성공, 잔액 0으로 소모(열람 과금은 수락/거절 무관)")
    void respondToApplication_exactBalance_declineStillConsumes() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        grantAttendanceCredits(owner, 2);

        JobApplicantListItemResponse responded = applicationService.respondToApplication(created.id(), owner.getId(), false);

        assertThat(responded.status()).isEqualTo("DECLINED");
        assertThat(attendanceCreditRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isZero();
    }

    @Test
    @DisplayName("사장 출근권 잔액이 부족해도 직원의 지원(apply) 자체는 막히지 않는다(구직자 완전 무과금 원칙)")
    void apply_neverGatedByMasterCredit() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        grantAttendanceCredits(owner, 0); // 사장 잔액 0

        JobApplicationResponse resp = applicationService.apply(p.getId(), applicant.getId(), null);

        assertThat(resp.status()).isEqualTo("PENDING");
    }

    // ─────────────────────────────────────────────────────────────────
    // 무제한 패스 과금 우회(recruitment-monetization-gamification-plan.md §2.5)
    // ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("활성 무제한 패스 보유 중이면 잔액이 0이어도 지원서 열람(응답)에 출근권을 소모하지 않는다")
    void respondToApplication_withActiveBoostPass_skipsCreditConsumption() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        grantAttendanceCredits(owner, 0); // 잔액 0
        activateBoostPass(owner, 7);

        JobApplicantListItemResponse responded = applicationService.respondToApplication(created.id(), owner.getId(), true);

        assertThat(responded.status()).isEqualTo("ACCEPTED");
        assertThat(attendanceCreditRepo.findByOwnerUserId(owner.getId()).orElseThrow().getBalance()).isZero(); // 소모 없이 0 그대로
    }

    @Test
    @DisplayName("무제한 패스가 만료된 뒤에는 다시 정상적으로 출근권을 소모한다(잔액 부족 시 402도 재현됨)")
    void respondToApplication_afterBoostPassExpired_resumesCreditConsumption() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store, true);
        User applicant = applicantUser();
        grantEligibility(applicant, store);
        JobApplicationResponse created = applicationService.apply(p.getId(), applicant.getId(), null);
        activateBoostPass(owner, 7);
        expireBoostPass(owner);
        grantAttendanceCredits(owner, 0); // 잔액 0 — 패스가 만료됐으니 다시 출근권이 필요해야 함

        assertThatThrownBy(() -> applicationService.respondToApplication(created.id(), owner.getId(), true))
                .isInstanceOf(InsufficientCreditException.class);
    }
}
