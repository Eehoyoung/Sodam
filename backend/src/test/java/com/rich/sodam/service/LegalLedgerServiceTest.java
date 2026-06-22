package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.EmployeeRosterResponse;
import com.rich.sodam.dto.response.WageLedgerResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 법정 장부 자료 집계 (B8) — 임금대장 항목별 합산 + 근로자명부 구성 검증.
 */
class LegalLedgerServiceTest {

    private final PayrollRepository payrollRepo = mock(PayrollRepository.class);
    private final EmployeeStoreRelationRepository relationRepo = mock(EmployeeStoreRelationRepository.class);
    private final LegalLedgerService service = new LegalLedgerService(payrollRepo, relationRepo);

    private EmployeeProfile emp(long id, String name) {
        User u = mock(User.class);
        when(u.getName()).thenReturn(name);
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(id);
        when(e.getUser()).thenReturn(u);
        return e;
    }

    private Payroll payroll(EmployeeProfile e, int regular, int overtime, int night,
                            int holiday, int weekly, int gross, int tax, int deductions, int net) {
        Payroll p = mock(Payroll.class);
        when(p.getEmployee()).thenReturn(e);
        when(p.getRegularWage()).thenReturn(regular);
        when(p.getOvertimeWage()).thenReturn(overtime);
        when(p.getNightWorkWage()).thenReturn(night);
        when(p.getHolidayWorkWage()).thenReturn(holiday);
        when(p.getWeeklyAllowance()).thenReturn(weekly);
        when(p.getGrossWage()).thenReturn(gross);
        when(p.getTaxAmount()).thenReturn(tax);
        when(p.getDeductions()).thenReturn(deductions);
        when(p.getNetWage()).thenReturn(net);
        return p;
    }

    @Test
    @DisplayName("임금대장: 같은 직원 다건 합산 + 항목별·매장 합계, 공제=세액+기타")
    void wageLedgerAggregates() {
        // 모킹을 먼저 생성(중첩 스터빙 방지) 후 전달
        EmployeeProfile kim = emp(10, "김알바");
        EmployeeProfile lee = emp(20, "이파트");
        Payroll k1 = payroll(kim, 1_000_000, 100_000, 50_000, 0, 200_000, 1_350_000, 44_550, 5_000, 1_300_450);
        Payroll k2 = payroll(kim, 500_000, 0, 0, 80_000, 100_000, 680_000, 22_440, 0, 657_560);
        Payroll l1 = payroll(lee, 800_000, 0, 0, 0, 160_000, 960_000, 31_680, 0, 928_320);
        when(payrollRepo.findByStoreIdAndPeriod(eq(1L), any(), any())).thenReturn(List.of(k1, k2, l1));

        WageLedgerResponse res = service.wageLedger(1L, 2026, 6);

        assertThat(res.year()).isEqualTo(2026);
        assertThat(res.month()).isEqualTo(6);
        assertThat(res.employeeCount()).isEqualTo(2);
        assertThat(res.totalGross()).isEqualTo(1_350_000 + 680_000 + 960_000);
        assertThat(res.totalDeduction()).isEqualTo((44_550 + 5_000) + 22_440 + 31_680);
        assertThat(res.totalNet()).isEqualTo(1_300_450 + 657_560 + 928_320);

        WageLedgerResponse.WageLine kimLine = res.items().stream()
                .filter(i -> i.employeeId() == 10L).findFirst().orElseThrow();
        assertThat(kimLine.employeeName()).isEqualTo("김알바");
        assertThat(kimLine.regularWage()).isEqualTo(1_500_000);
        assertThat(kimLine.overtimeWage()).isEqualTo(100_000);
        assertThat(kimLine.nightWorkWage()).isEqualTo(50_000);
        assertThat(kimLine.holidayWorkWage()).isEqualTo(80_000);
        assertThat(kimLine.weeklyAllowance()).isEqualTo(300_000);
        assertThat(kimLine.grossWage()).isEqualTo(2_030_000);
        assertThat(kimLine.deduction()).isEqualTo(44_550 + 5_000 + 22_440);
        assertThat(kimLine.netWage()).isEqualTo(1_300_450 + 657_560);
        assertThat(res.disclaimer()).contains("참고용");
    }

    @Test
    @DisplayName("임금대장: 급여 없으면 빈 집계")
    void wageLedgerEmpty() {
        when(payrollRepo.findByStoreIdAndPeriod(eq(2L), any(), any())).thenReturn(List.of());
        WageLedgerResponse res = service.wageLedger(2L, 2026, 6);
        assertThat(res.employeeCount()).isZero();
        assertThat(res.totalGross()).isZero();
        assertThat(res.items()).isEmpty();
    }

    @Test
    @DisplayName("근로자명부: 직원별 이름·입사일·시급·재직상태 구성")
    void rosterComposes() {
        // 모킹을 먼저 생성(중첩 스터빙 방지) 후 전달
        Store store = mock(Store.class);
        when(store.getStoreStandardHourWage()).thenReturn(10_030);
        EmployeeProfile kimProfile = emp(10, "김알바");
        EmployeeProfile leeProfile = emp(20, "이파트");

        EmployeeStoreRelation r1 = mock(EmployeeStoreRelation.class);
        when(r1.getEmployeeProfile()).thenReturn(kimProfile);
        when(r1.getHireDate()).thenReturn(LocalDate.of(2025, 3, 1));
        when(r1.getUseStoreStandardWage()).thenReturn(false);
        when(r1.getCustomHourlyWage()).thenReturn(12_000);
        when(r1.getIsActive()).thenReturn(true);

        EmployeeStoreRelation r2 = mock(EmployeeStoreRelation.class);
        when(r2.getEmployeeProfile()).thenReturn(leeProfile);
        when(r2.getHireDate()).thenReturn(LocalDate.of(2024, 1, 15));
        when(r2.getUseStoreStandardWage()).thenReturn(true);
        when(r2.getStore()).thenReturn(store);
        when(r2.getIsActive()).thenReturn(false);

        when(relationRepo.findByStore_Id(1L)).thenReturn(List.of(r1, r2));

        EmployeeRosterResponse res = service.employeeRoster(1L);

        assertThat(res.employeeCount()).isEqualTo(2);

        EmployeeRosterResponse.RosterLine kim = res.items().get(0);
        assertThat(kim.employeeId()).isEqualTo(10L);
        assertThat(kim.employeeName()).isEqualTo("김알바");
        assertThat(kim.hireDate()).isEqualTo(LocalDate.of(2025, 3, 1));
        assertThat(kim.hourlyWage()).isEqualTo(12_000);
        assertThat(kim.active()).isTrue();

        EmployeeRosterResponse.RosterLine lee = res.items().get(1);
        assertThat(lee.hourlyWage()).isEqualTo(10_030);
        assertThat(lee.active()).isFalse();
        assertThat(res.disclaimer()).contains("참고용");
    }

    @Test
    @DisplayName("근로자명부: 직원 없으면 빈 명부")
    void rosterEmpty() {
        when(relationRepo.findByStore_Id(9L)).thenReturn(List.of());
        EmployeeRosterResponse res = service.employeeRoster(9L);
        assertThat(res.employeeCount()).isZero();
        assertThat(res.items()).isEmpty();
    }
}
