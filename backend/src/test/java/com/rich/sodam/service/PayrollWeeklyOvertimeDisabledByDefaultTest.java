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
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 주 40시간 초과 연장가산은 기본적으로 꺼져 있어야 한다 (RELEASE_GATES G-9).
 *
 * <p>정산기간 경계에 걸친 주(週)의 귀속 규칙이 확정되기 전에 이 기능을 켜면, 주가 정산 시작일에
 * 걸릴 때 앞뒤 기간 모두에서 그 주의 연장수당이 빠지거나 정산이 중단된다. 노무사 회신 전까지
 * 누군가 실수로 기본값을 뒤집지 못하도록 여기서 고정한다. 켠 상태의 계산 정확성은
 * {@code PayrollPayableHoursComplianceTest} 가 검증한다.</p>
 */
@SpringBootTest
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
    @DisplayName("주 42시간을 일해도 기본 설정에서는 주 단위 연장가산이 붙지 않는다")
    void 주40시간_초과분은_기본설정에서_가산되지_않는다() {
        LocalDate monday = LocalDate.of(2026, 8, 3);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, day.atTime(16, 30)); // 7.5h gross − 0.5h 휴게 = 7h/일 → 주 42h
        }

        Payroll payroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        // 일 8시간을 넘긴 날이 없으므로 연장은 0이어야 한다(주 단위 가산이 꺼져 있음).
        assertThat(payroll.getOvertimeHours()).isZero();
        assertThat(payroll.getOvertimeWage()).isZero();
    }

    @Test
    @DisplayName("주가 정산 시작일에 걸쳐도 정산이 중단되지 않는다")
    void 정산기간_경계에_걸친_주에도_정산이_막히지_않는다() {
        // 월~토(7/27~8/1) 근무 후, 정산기간이 8/1 에 시작해 그 주의 종료일(8/2)만 포함하는 상황.
        // 기능이 켜져 있으면 PAYROLL_WEEKLY_OVERTIME_ALLOCATION_REQUIRED 로 중단되던 패턴이다.
        LocalDate monday = LocalDate.of(2026, 7, 27);
        for (int offset = 0; offset < 6; offset++) {
            LocalDate day = monday.plusDays(offset);
            work(day, day.atTime(16, 30));
        }

        assertThatCode(() -> payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 2), LocalDate.of(2026, 8, 2)))
                .doesNotThrowAnyException();
    }

    private void work(LocalDate day, java.time.LocalDateTime checkOut) {
        Attendance attendance = new Attendance(employee, store);
        attendance.manualCheckIn(day.atTime(9, 0), 37.5665, 126.9780, relation.getAppliedHourlyWage());
        attendance.manualCheckOut(checkOut, 37.5665, 126.9780);
        attendanceRepository.save(attendance);
    }
}
