package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.exception.BusinessException;
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
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 주 40시간 초과 연장가산(§56①)의 계산 정확성 검증.
 *
 * <p>속성을 덮어쓰지 않는다 — <b>운영 기본값 그대로</b> 검증해야 "기본값이 꺼져서 통과했다"는
 * 착시가 생기지 않는다. 비상 차단 스위치의 동작은
 * {@code PayrollWeeklyOvertimeDisabledByDefaultTest} 가 따로 지킨다.</p>
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollPayableHoursComplianceTest {

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
        User user = userRepository.save(new User("payable-hours-" + suffix + "@example.com", "Payroll test"));
        employee = employeeProfileRepository.save(new EmployeeProfile(user));
        store = storeRepository.save(new Store("Payable hours store", suffix.substring(suffix.length() - 10),
                "02-1234-5678", "Cafe", HOURLY_WAGE, 100));
        relation = relationRepository.save(new EmployeeStoreRelation(employee, store, HOURLY_WAGE));
    }

    @Test
    void weeklyAllowanceThresholdUsesPayableHoursAt1499And1500() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        work(monday, 9, 0, monday.atTime(12, 0));
        work(monday.plusDays(1), 9, 0, monday.plusDays(1).atTime(12, 0));
        work(monday.plusDays(2), 9, 0, monday.plusDays(2).atTime(12, 0));
        work(monday.plusDays(3), 9, 0, monday.plusDays(3).atTime(12, 0));
        work(monday.plusDays(4), 9, 0, monday.plusDays(4).atTime(11, 59, 24));

        Payroll belowThreshold = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(belowThreshold.getWeeklyAllowance()).isZero();

        setUp();
        for (int offset = 0; offset < 5; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(12, 0));
        }

        Payroll atThreshold = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), true);

        assertThat(atThreshold.getWeeklyAllowance()).isPositive();
    }

    @Test
    @DisplayName("주 42시간이면 초과 2시간의 가산분(50%)만 별도 항목으로 지급한다")
    void weeklyHoursAboveFortyReceiveOnlyTheAdditionalWeeklyOvertimePremium() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30)); // 7.5 gross - 0.5 statutory break = 7 paid
        }

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        // 일자별 재분류를 하지 않으므로 정상근로 시간은 42h 그대로다.
        assertThat(payroll.getRegularHours()).isEqualTo(42.0);
        assertThat(payroll.getOvertimeHours()).isZero();   // 일 8h 초과는 없다

        // 주 40h 초과 2시간에 대한 가산분(50%)만 별도 항목으로 잡힌다.
        assertThat(payroll.getWeeklyOvertimeHours()).isEqualTo(2.0);
        assertThat(payroll.getWeeklyOvertimeWage()).isEqualTo(10_000); // 2h × 10,000 × 0.5

        // 기본 100%는 이미 정상근로 임금에 있으므로 세전 합계는 42h 임금 + 가산분이다.
        assertThat(payroll.getGrossWage())
                .isEqualTo(payroll.getRegularWage() + 10_000 + nzInt(payroll.getWeeklyAllowance()));
    }

    private int nzInt(Integer value) {
        return value == null ? 0 : value;
    }

    @Test
    @DisplayName("5인 미만 사업장은 주 40시간을 넘겨도 연장가산이 붙지 않는다(§11①)")
    void 오인미만_사업장은_주단위_연장가산_대상이_아니다() {
        store.applyEmployeeCount(4); // 상시 4명 → §56 가산 제외
        storeRepository.save(store);

        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30)); // 주 42h
        }

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(payroll.getWeeklyOvertimeHours()).isZero();
        assertThat(payroll.getWeeklyOvertimeWage()).isZero();
        // 근로시간 자체는 그대로 기록된다 — 가산만 없을 뿐이다.
        assertThat(payroll.getRegularHours()).isEqualTo(42.0);
    }

    @Test
    @DisplayName("주가 정산기간 시작일에 걸쳐도 정산이 중단되지 않는다(총액 가산이라 배분 불필요)")
    void 경계주에도_정산이_막히지_않는다() {
        LocalDate monday = LocalDate.of(2026, 7, 27);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30));
        }

        // 재분류 방식에서는 PAYROLL_WEEKLY_OVERTIME_ALLOCATION_REQUIRED 로 막히던 패턴이다.
        assertThatCode(() -> payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 2)))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("월 경계에 걸친 주는 종료일이 속한 정산기간에만 전액 귀속된다")
    void weeklyOvertimeUsesTheCompleteCrossMonthWeekAndBelongsOnlyToWeekEndPayrollPeriod() {
        LocalDate monday = LocalDate.of(2026, 7, 27);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30));
        }

        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        // 주 7/27~8/2 의 종료일은 8/2 → 8월에만 잡히고 7월에는 0이어야 한다(중복·분할 금지).
        assertThat(july.getWeeklyOvertimeHours()).isZero();
        assertThat(july.getWeeklyOvertimeWage()).isZero();
        assertThat(august.getWeeklyOvertimeHours()).isEqualTo(2.0);
        assertThat(august.getWeeklyOvertimeWage()).isEqualTo(10_000);
    }

    /**
     * 재분류 방식일 때는 이 두 시나리오가 배분 실패로 정산을 중단시켰다
     * (PAYROLL_WEEKLY_OVERTIME_ALLOCATION_REQUIRED). 총액 가산으로 바꾼 뒤에는 배분 자체가
     * 없으므로 정상 산정된다 — 예외가 되살아나지 않도록 여기서 고정한다.
     */
    @Test
    @DisplayName("정산기간이 주 종료일 하루뿐이어도 그 주의 초과분이 전액 산정된다")
    void 하루짜리_정산기간에도_주_초과분이_산정된다() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30));
        }
        LocalDate sunday = monday.plusDays(6);
        work(sunday, 9, 0, sunday.atTime(10, 0)); // 일요일 1시간 → 주 43h

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(), sunday, sunday);

        assertThat(payroll.getWeeklyOvertimeHours()).isEqualTo(3.0); // 43h − 40h
        assertThat(payroll.getWeeklyOvertimeWage()).isEqualTo(15_000);
    }

    @Test
    @DisplayName("정산기간에 그 주의 근무일이 하나도 없어도 초과분이 누락되지 않는다")
    void 근무일이_없는_경계기간에도_주_초과분이_산정된다() {
        LocalDate monday = LocalDate.of(2026, 7, 27);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30)); // 월~토 42h, 일(8/2)은 휴무
        }

        LocalDate sunday = monday.plusDays(6);
        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(), sunday, sunday);

        assertThat(payroll.getWeeklyOvertimeHours()).isEqualTo(2.0);
        assertThat(payroll.getWeeklyOvertimeWage()).isEqualTo(10_000);
    }

    private void work(LocalDate day, int hour, int minute, LocalDateTime checkOut) {
        Attendance attendance = new Attendance(employee, store);
        attendance.manualCheckIn(day.atTime(hour, minute), 37.5665, 126.9780, relation.getAppliedHourlyWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }
}
