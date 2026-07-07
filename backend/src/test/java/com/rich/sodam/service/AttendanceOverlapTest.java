package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.exception.InvalidOperationException;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Phase 2.5(DB_OPTIMIZATION_PLAN.md §2.8(d)) — 출퇴근 시간대 겹침 방지 검증.
 *
 * <p>정책: 직원 1명이 같은 날 서로 다른 매장에서 근무할 수 있다(시간대 비중첩 필수). 과거 버그는
 * "당일 기록이 하나라도 있으면 매장 무관 전면 차단"이라 이 정책 자체를 위반했다. 이 테스트는
 * 계획서 §Phase 2.5 검증란에 명시된 3가지 케이스를 그대로 고정한다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AttendanceOverlapTest {

    @Autowired private AttendanceService attendanceService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository employeeStoreRelationRepository;
    @Autowired private AttendanceRepository attendanceRepository;

    private EmployeeProfile employee;
    private Store storeA;
    private Store storeB;

    @BeforeEach
    void setUp() {
        User user = new User("overlap_emp@example.com", "겹침테스트직원");
        user.setLocationInfoAgreedAt(LocalDateTime.now());
        user = userRepository.save(user);

        employee = employeeProfileRepository.save(new EmployeeProfile(user));

        storeA = storeRepository.save(new Store("A매장", "1110002220", "02-1", "카페", 10000, 100));
        storeB = storeRepository.save(new Store("B매장", "3330004440", "02-2", "카페", 10000, 100));

        employeeStoreRelationRepository.save(new EmployeeStoreRelation(employee, storeA, 10000));
        employeeStoreRelationRepository.save(new EmployeeStoreRelation(employee, storeB, 10000));
    }

    private LocalDateTime today(int hour) {
        return LocalDate.now().atTime(hour, 0);
    }

    @Test
    @DisplayName("A매장 09-13시 근무 후 B매장 14-18시(비중첩) 체크인은 성공한다")
    void nonOverlappingShiftsAcrossStoresSucceed() {
        attendanceService.checkIn(employee.getId(), storeA.getId(), null, null, today(9));
        attendanceService.checkOut(employee.getId(), storeA.getId(), null, null, today(13));

        Attendance result = attendanceService.checkIn(employee.getId(), storeB.getId(), null, null, today(14));

        assertThat(result).isNotNull();
        assertThat(result.getStore().getId()).isEqualTo(storeB.getId());
        assertThat(result.getCheckInTime()).isEqualTo(today(14));
    }

    @Test
    @DisplayName("A매장 09-13시 근무 완료 후 B매장 12시(중첩) 체크인은 거부된다")
    void overlappingCheckInAcrossStoresIsRejected() {
        attendanceService.checkIn(employee.getId(), storeA.getId(), null, null, today(9));
        attendanceService.checkOut(employee.getId(), storeA.getId(), null, null, today(13));

        assertThatThrownBy(() -> attendanceService.checkIn(
                employee.getId(), storeB.getId(), null, null, today(12)))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("다른 매장 근무 기록과 겹쳐요");
    }

    @Test
    @DisplayName("A매장 근무 중(체크아웃 전)에 B매장 체크아웃을 요청하면 A가 아닌 B 기록만 종료된다")
    void checkOutTargetsCorrectStoreEvenWhenAnotherStoreIsStillOpen() {
        // 실제 라이브 흐름에서는 겹침 검증이 두 매장 동시 진행중 상태를 막지만, 데이터 이상 상태(예:
        // 과거 버그로 생성된 레코드)에서도 checkOut이 엉뚱한 매장 기록을 건드리지 않아야 하므로
        // 리포지토리로 두 매장 모두 진행중 상태를 직접 재현해 checkOut 자체의 대상 특정 로직만 검증한다.
        Attendance openAtA = new Attendance(employee, storeA);
        openAtA.manualCheckIn(today(9), null, null, 10000);
        attendanceRepository.save(openAtA);

        Attendance openAtB = new Attendance(employee, storeB);
        openAtB.manualCheckIn(today(10), null, null, 10000);
        attendanceRepository.save(openAtB);

        Attendance result = attendanceService.checkOut(employee.getId(), storeB.getId(), null, null, today(18));

        assertThat(result.getId()).isEqualTo(openAtB.getId());
        assertThat(result.getCheckOutTime()).isEqualTo(today(18));

        Attendance reloadedA = attendanceRepository.findById(openAtA.getId()).orElseThrow();
        assertThat(reloadedA.getCheckOutTime()).isNull();
    }
}
