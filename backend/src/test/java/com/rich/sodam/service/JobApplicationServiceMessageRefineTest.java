package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.AttendanceCredit;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.MasterProfile;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.dto.request.JobPostingUpsertRequest;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.repository.AttendanceCreditRepository;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.JobPostingRepository;
import com.rich.sodam.repository.MasterProfileRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.JobApplicationService.MessageRefineResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * WP-3 — 지원 메시지 다듬기(refineMessage) 자격 검증 테스트. 아직 JobApplication이 생성되기 전
 * 단계(제출 전 초안)라 apply()와 동일한 지원 자격(출퇴근 이력) 게이트를 재사용한다.
 * 테스트 프로필은 sodam.ai.provider가 미설정이라 AnthropicTextClient 빈이 없다 — 이 스위트는
 * "자격 검증"과 "provider 미설정 시 원본 그대로 통과"를 동시에 실측한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class JobApplicationServiceMessageRefineTest {

    @Autowired private JobApplicationService applicationService;
    @Autowired private JobPostingService postingService;
    @Autowired private JobPostingRepository jobPostingRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private EmployeeProfileRepository employeeProfileRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private MasterProfileRepository masterProfileRepo;
    @Autowired private MasterStoreRelationRepository masterStoreRelationRepo;
    @Autowired private AttendanceRepository attendanceRepo;
    @Autowired private AttendanceCreditRepository attendanceCreditRepo;

    private int bizSeq = 0;
    private int emailSeq = 0;

    private User masterUser() {
        User u = new User("refine_owner" + (emailSeq++) + "@x.com", "사장");
        u.setUserGrade(UserGrade.MASTER);
        return userRepo.save(u);
    }

    private User applicantUser() {
        User u = new User("refine_applicant" + (emailSeq++) + "@x.com", "직원");
        u.setUserGrade(UserGrade.EMPLOYEE);
        return userRepo.save(u);
    }

    private Store store(User owner) {
        String biz = String.format("%010d", 7_520_000_000L + (bizSeq++));
        Store s = storeRepo.save(new Store("지원다듬기테스트매장", biz, "02-000-0000", "카페", 10_000, 100));
        s.updateLocation(37.5665, 126.9780, "서울 중구", 100);
        s = storeRepo.save(s);
        MasterProfile mp = masterProfileRepo.save(new MasterProfile(owner));
        masterStoreRelationRepo.save(new MasterStoreRelation(mp, s));
        AttendanceCredit wallet = attendanceCreditRepo.findByOwnerUserId(owner.getId())
                .orElseGet(() -> attendanceCreditRepo.save(AttendanceCredit.openFor(owner.getId())));
        ReflectionTestUtils.setField(wallet, "balance", 1_000);
        attendanceCreditRepo.save(wallet);
        return s;
    }

    private JobPosting posting(Store store) {
        postingService.upsertPosting(store.getId(), new JobPostingUpsertRequest(
                "REGULAR", "CAFE", null, LocalTime.of(9, 0), LocalTime.of(18, 0), 11_000, "같이 일해요", true));
        return jobPostingRepo.findByStore_Id(store.getId()).orElseThrow();
    }

    private void grantEligibility(User u, Store store) {
        EmployeeProfile emp = employeeProfileRepo.save(new EmployeeProfile(u));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 10_000);
        attendanceRepo.save(a);
    }

    @Test
    @DisplayName("지원 자격(출퇴근 이력)이 있으면 provider 미설정 상태에서 원본 메시지를 그대로 반환한다(외부 호출 0)")
    void refineWithEligibilityFallsBackToOriginalWhenProviderUnset() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store);
        User applicant = applicantUser();
        grantEligibility(applicant, store);

        MessageRefineResult result = applicationService.refineMessage(p.getId(), applicant.getId(), "잘 부탁드려요");

        assertThat(result.refined()).isEqualTo("잘 부탁드려요");
        assertThat(result.changed()).isFalse();
    }

    @Test
    @DisplayName("출퇴근 이력 없는 사용자의 다듬기 시도는 JOB_APPLICATION_NOT_ELIGIBLE로 차단된다(apply()와 동일 게이트)")
    void refineWithoutEligibilityIsBlocked() {
        User owner = masterUser();
        Store store = store(owner);
        JobPosting p = posting(store);
        User applicant = applicantUser();
        // grantEligibility 호출 없음

        assertThatThrownBy(() -> applicationService.refineMessage(p.getId(), applicant.getId(), "아무 메시지"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).getErrorCode()).isEqualTo("JOB_APPLICATION_NOT_ELIGIBLE"));
    }
}
