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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
    void weeklyHoursAboveFortyReceiveOnlyTheAdditionalWeeklyOvertimePremium() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30)); // 7.5 gross - 0.5 statutory break = 7 paid
        }

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(payroll.getRegularHours()).isEqualTo(40.0);
        assertThat(payroll.getOvertimeHours()).isEqualTo(2.0);
        assertThat(payroll.getOvertimeWage()).isEqualTo(30_000);
    }

    @Test
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

        assertThat(july.getOvertimeHours()).isZero();
        assertThat(july.getOvertimeWage()).isZero();
        assertThat(august.getOvertimeHours()).isEqualTo(2.0);
        assertThat(august.getOvertimeWage()).isEqualTo(30_000);
    }

    @Test
    void failsClosedWhenWeekEndPayrollCannotContainAllWeeklyOvertimeHours() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30));
        }
        LocalDate sunday = monday.plusDays(6);
        work(sunday, 9, 0, sunday.atTime(10, 0));

        assertThatThrownBy(() -> payrollService.calculatePayroll(employee.getId(), store.getId(), sunday, sunday))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo("PAYROLL_WEEKLY_OVERTIME_ALLOCATION_REQUIRED");
    }

    @Test
    void failsClosedWhenWeekEndPayrollHasNoDetailForWeeklyOvertimeAllocation() {
        LocalDate monday = LocalDate.of(2026, 7, 27);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, 9, 0, day.atTime(16, 30));
        }

        LocalDate sunday = monday.plusDays(6);
        assertThatThrownBy(() -> payrollService.calculatePayroll(employee.getId(), store.getId(), sunday, sunday))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo("PAYROLL_WEEKLY_OVERTIME_ALLOCATION_REQUIRED");
    }

    private void work(LocalDate day, int hour, int minute, LocalDateTime checkOut) {
        Attendance attendance = new Attendance(employee, store);
        attendance.manualCheckIn(day.atTime(hour, minute), 37.5665, 126.9780, relation.getAppliedHourlyWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }
}
