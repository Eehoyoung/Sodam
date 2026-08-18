package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.UserGrade;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.service.AttendanceCorrectionService.ReasonRefineResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-1 — 정정 사유 다듬기(refineReason) 소유권 검증 테스트. 테스트 프로필은
 * sodam.ai.provider가 미설정이라 AnthropicTextClient 빈이 없다 — 즉 이 스위트는
 * "본인 소유 검증"과 "provider 미설정 시 원본 그대로 통과"를 동시에 실측한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceCorrectionServiceReasonRefineTest {

    @Autowired private AttendanceCorrectionService service;
    @Autowired private UserRepository userRepo;
    @Autowired private StoreRepository storeRepo;
    @Autowired private EmployeeProfileRepository empRepo;
    @Autowired private EmployeeStoreRelationRepository relRepo;
    @Autowired private AttendanceRepository attendanceRepo;

    private int bizSeq = 0;

    private Store store() {
        String biz = String.format("%010d", 5556667770L + (bizSeq++));
        return storeRepo.save(new Store("정정매장", biz, "02-777-8888", "카페", 10_000, 100));
    }

    private EmployeeProfile employee(String email, String name) {
        User u = new User(email, name);
        u.setUserGrade(UserGrade.EMPLOYEE);
        u = userRepo.save(u);
        return empRepo.save(new EmployeeProfile(u));
    }

    private Attendance attendanceOf(EmployeeProfile emp, Store store) {
        relRepo.save(new EmployeeStoreRelation(emp, store, 12_000));
        Attendance a = new Attendance(emp, store);
        a.checkIn(37.0, 127.0, 12_000);
        return attendanceRepo.save(a);
    }

    @Test
    @DisplayName("본인 출퇴근 기록의 사유 다듬기는 provider 미설정 상태에서 원본을 그대로 반환한다(외부 호출 0)")
    void refinesOwnRecordFallsBackToOriginalWhenProviderUnset() {
        Store store = store();
        EmployeeProfile emp = employee("owner1@x.com", "김직원");
        Attendance attendance = attendanceOf(emp, store);

        ReasonRefineResult result = service.refineReason(attendance.getId(), emp.getId(),
                "사장님이 퇴근 처리를 늦게 눌러주셔서 실제 시간과 달라요");

        assertThat(result.forbidden()).isFalse();
        assertThat(result.refined()).isEqualTo("사장님이 퇴근 처리를 늦게 눌러주셔서 실제 시간과 달라요");
        assertThat(result.changed()).isFalse();
    }

    @Test
    @DisplayName("타인 출퇴근 기록에 대한 사유 다듬기는 forbidden으로 차단된다")
    void refiningOthersRecordIsForbidden() {
        Store store = store();
        EmployeeProfile owner = employee("owner2@x.com", "김직원");
        EmployeeProfile stranger = employee("stranger@x.com", "이남남");
        Attendance attendance = attendanceOf(owner, store);

        ReasonRefineResult result = service.refineReason(attendance.getId(), stranger.getId(), "아무 사유");

        assertThat(result.forbidden()).isTrue();
        assertThat(result.refined()).isNull();
    }
}
