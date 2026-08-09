package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.PayrollPolicy;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.TaxPolicyType;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.LaborContractRepository;
import com.rich.sodam.repository.PayrollPolicyRepository;
import com.rich.sodam.repository.StoreRepository;
import com.rich.sodam.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PayrollWeeklyAllowanceContractPolicyTest {

    private static final int HOURLY_WAGE = 15_000;

    @Autowired private PayrollService payrollService;
    @Autowired private UserRepository userRepository;
    @Autowired private EmployeeProfileRepository employeeProfileRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private EmployeeStoreRelationRepository relationRepository;
    @Autowired private AttendanceRepository attendanceRepository;
    @Autowired private LaborContractRepository laborContractRepository;
    @Autowired private PayrollPolicyRepository payrollPolicyRepository;

    private EmployeeProfile employee;
    private Store store;
    private EmployeeStoreRelation relation;

    @BeforeEach
    void setUp() {
        String suffix = String.valueOf(System.nanoTime());
        User user = userRepository.save(new User("weekly-contract-" + suffix + "@example.com", "Test employee"));
        employee = employeeProfileRepository.save(new EmployeeProfile(user));
        store = storeRepository.save(new Store("Weekly contract store", suffix.substring(Math.max(0, suffix.length() - 10)),
                "02-1234-5678", "Cafe", HOURLY_WAGE, 100));
        relation = relationRepository.save(new EmployeeStoreRelation(employee, store, HOURLY_WAGE));
    }

    @Test
    void signed_contract_holiday_takes_priority_over_global_monday_policy() {
        LaborContract contract = new LaborContract();
        contract.setEmployeeId(employee.getId());
        contract.setStoreId(store.getId());
        contract.setStartDate(LocalDate.of(2026, 7, 1));
        contract.setWeeklyHolidayDay("SATURDAY"); // Sunday week start
        contract.setSentAt(LocalDate.of(2026, 7, 1).atStartOfDay());
        contract.setEmployeeSignedAt(LocalDate.of(2026, 7, 1).atStartOfDay());
        laborContractRepository.save(contract);
        workFiveDays(LocalDate.of(2026, 7, 26)); // Sun-Thu: contract week ends Aug 1

        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(july.getWeeklyAllowance()).isZero();
        assertThat(august.getWeeklyAllowance()).isEqualTo(8 * HOURLY_WAGE);
    }

    @Test
    void unsigned_or_future_contract_falls_back_to_global_policy() {
        LaborContract contract = new LaborContract();
        contract.setEmployeeId(employee.getId());
        contract.setStoreId(store.getId());
        contract.setStartDate(LocalDate.of(2026, 9, 1));
        contract.setWeeklyHolidayDay("SATURDAY");
        contract.setSentAt(LocalDate.of(2026, 7, 1).atStartOfDay());
        laborContractRepository.save(contract); // no employee signature and not effective in August
        workFiveDays(LocalDate.of(2026, 7, 27)); // Mon-Fri: global Monday week ends Aug 2

        Payroll july = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 31));
        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(july.getWeeklyAllowance()).isZero();
        assertThat(august.getWeeklyAllowance()).isEqualTo(8 * HOURLY_WAGE);
    }

    @Test
    void monday_holiday_contract_groups_a_complete_tuesday_week() {
        laborContractRepository.save(signedContract(LocalDate.of(2026, 7, 1), "MONDAY"));
        workFiveDays(LocalDate.of(2026, 8, 4)); // Tuesday-Saturday, 40h in the Tuesday-start week

        Payroll august = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertThat(august.getWeeklyAllowance()).isEqualTo(8 * HOURLY_WAGE);
    }

    @Test
    void income_tax_3_3_switch_preserves_default_then_can_disable_weekly_allowance() {
        workFiveDays(LocalDate.of(2026, 8, 3));
        Payroll defaultPayroll = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));
        assertThat(defaultPayroll.getWeeklyAllowance()).isEqualTo(8 * HOURLY_WAGE);

        PayrollPolicy policy = payrollPolicyRepository.findByStore(store).orElseThrow();
        policy.setTaxPolicyType(TaxPolicyType.INCOME_TAX_3_3);
        policy.setWeeklyAllowanceEnabled(true);
        policy.setWeeklyAllowanceForIncomeTax3_3Enabled(false);
        payrollPolicyRepository.save(policy);

        Payroll excluded = payrollService.calculatePayroll(employee.getId(), store.getId(),
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31), true);
        assertThat(excluded.getWeeklyAllowance()).isZero();
    }

    private void workFiveDays(LocalDate start) {
        for (int offset = 0; offset < 5; offset++) {
            LocalDate day = start.plusDays(offset);
            Attendance attendance = new Attendance(employee, store);
            attendance.manualCheckIn(day.atTime(9, 0), 37.5665, 126.9780, relation.getAppliedHourlyWage());
            attendance.manualCheckOut(day.atTime(17, 0), 37.5665, 126.9780);
            attendanceRepository.save(attendance);
        }
    }

    private LaborContract signedContract(LocalDate startDate, String weeklyHolidayDay) {
        LaborContract contract = new LaborContract();
        contract.setEmployeeId(employee.getId());
        contract.setStoreId(store.getId());
        contract.setStartDate(startDate);
        contract.setWeeklyHolidayDay(weeklyHolidayDay);
        contract.setSentAt(startDate.atStartOfDay());
        contract.setEmployeeSignedAt(startDate.atStartOfDay());
        return contract;
    }
}
