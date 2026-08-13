package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 주 40시간 초과 연장가산의 <b>비상 차단 스위치</b>가 실제로 동작하는지 검증한다.
 *
 * <p>운영 기본값은 활성(true)이다 — 끄면 주 6일×7시간 같은 스케줄에서 §56① 가산임금이
 * 체계적으로 누락된다(노무·법무 2자 검토, 2026-08-10). 이 스위치는 사고 시 되돌릴 수단으로만
 * 남겨 둔 것이므로, 여기서는 "끄면 정말 꺼지는가"만 확인한다. 켠 상태(=기본값)의 계산
 * 정확성은 {@code PayrollPayableHoursComplianceTest} 가 검증한다.</p>
 */
@SpringBootTest(properties = "sodam.payroll.weekly-overtime-enabled=false")
@ActiveProfiles("test")
@Transactional
class PayrollWeeklyOvertimeDisabledByDefaultTest {

    private static final int HOURLY_WAGE = 10_000;

    @Autowired private PayrollService payrollService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private AttendanceRepository attendanceRepository;

    private EmployeeProfile employee;
    private Store store;
    private EmployeeStoreRelation relation;

    @BeforeEach
    void setUp() {
        String suffix = String.valueOf(System.nanoTime());
        User user = userRepository.save(new User("weekly-ot-off-" + suffix + "@example.com", "Payroll test"));
        employee = employeeProfileRepository.save(new EmployeeProfile(user));
        store = storeRepository.save(new Store("Weekly OT off store", suffix.substring(suffix.length() - 10),
                "02-1234-5678", "Cafe", HOURLY_WAGE, 100));
        relation = relationRepository.save(new EmployeeStoreRelation(employee, store, HOURLY_WAGE));
    }

    @Test
    @DisplayName("스위치를 끄면 주 42시간을 일해도 주 단위 가산이 산정되지 않는다")
    void 스위치를_끄면_주단위_가산이_산정되지_않는다() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, day.atTime(16, 30)); // 7.5h gross − 0.5h 휴게 = 7h/일 → 주 42h
        }

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(payroll.getWeeklyOvertimeHours()).isZero();
        assertThat(payroll.getWeeklyOvertimeWage()).isZero();
        // 일 8시간을 넘긴 날은 없으므로 일 단위 연장도 0이다.
        assertThat(payroll.getOvertimeHours()).isZero();
        // 근로시간과 기본임금은 그대로 지급된다 — 사라지는 것은 가산분뿐이다.
        assertThat(payroll.getRegularHours()).isEqualTo(42.0);
    }

    private void work(LocalDate day, java.time.LocalDateTime checkOut) {
        Attendance attendance = new Attendance(employee, store);
        attendance.manualCheckIn(day.atTime(9, 0), 37.5665, 126.9780, relation.getAppliedHourlyWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }
}
