package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobApplicationCreateRequest;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.dto.response.JobApplicantListItemResponse;
import com.rich.sodam.dto.response.JobApplicationResponse;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobApplicationRepository;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

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
        return s;
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
}
