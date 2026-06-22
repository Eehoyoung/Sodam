package com.rich.sodam.service;

import com.rich.sodam.domain.Attendance;
import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.WageHistory;
import com.rich.sodam.dto.response.EvidencePackageResponse;
import com.rich.sodam.repository.AttendanceRepository;
import com.rich.sodam.repository.EmployeeProfileRepository;
import com.rich.sodam.repository.PayrollRepository;
import com.rich.sodam.repository.WageHistoryRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 근무 증거 패키지 집계 (L-NEW-05) — 섹션 구성·빈 데이터·PII 안전선 검증.
 */
class EvidencePackageServiceTest {

    private final EmployeeProfileRepository employeeRepo = mock(EmployeeProfileRepository.class);
    private final AttendanceRepository attendanceRepo = mock(AttendanceRepository.class);
    private final PayrollRepository payrollRepo = mock(PayrollRepository.class);
    private final LaborContractService laborContractService = mock(LaborContractService.class);
    private final WageHistoryRepository wageHistoryRepo = mock(WageHistoryRepository.class);

    private final EvidencePackageService service = new EvidencePackageService(
            employeeRepo, attendanceRepo, payrollRepo, laborContractService, wageHistoryRepo);

    private final LocalDate FROM = LocalDate.of(2026, 3, 1);
    private final LocalDate TO = LocalDate.of(2026, 5, 31);

    private void stubName(long employeeId, String name) {
        User u = mock(User.class);
        when(u.getName()).thenReturn(name);
        EmployeeProfile emp = mock(EmployeeProfile.class);
        when(emp.getUser()).thenReturn(u);
        when(employeeRepo.findById(employeeId)).thenReturn(Optional.of(emp));
    }

    private Attendance attendance(LocalDateTime in, LocalDateTime out) {
        Attendance a = mock(Attendance.class);
        when(a.getCheckInTime()).thenReturn(in);
        long minutes = out != null ? java.time.Duration.between(in, out).toMinutes() : 0;
        when(a.getWorkingTimeInMinutes()).thenReturn(minutes);
        return a;
    }

    private Payroll payroll(int gross, int net, int tax, int deductions) {
        Payroll p = mock(Payroll.class);
        when(p.getGrossWage()).thenReturn(gross);
        when(p.getNetWage()).thenReturn(net);
        when(p.getTaxAmount()).thenReturn(tax);
        when(p.getDeductions()).thenReturn(deductions);
        return p;
    }

    @Test
    @DisplayName("근태·급여·계약·시급이력 4개 섹션을 한 묶음으로 집계")
    void aggregatesAllSections() {
        stubName(10L, "김알바");

        // 근태: 2일 출근(같은 날 2건 + 다른 날 1건 → 2일), 총 8h + 4h = 12h
        Attendance a1 = attendance(LocalDateTime.of(2026, 3, 2, 9, 0), LocalDateTime.of(2026, 3, 2, 17, 0));
        Attendance a2 = attendance(LocalDateTime.of(2026, 3, 2, 18, 0), LocalDateTime.of(2026, 3, 2, 18, 0));
        Attendance a3 = attendance(LocalDateTime.of(2026, 3, 5, 13, 0), LocalDateTime.of(2026, 3, 5, 17, 0));
        when(attendanceRepo.findByEmployeeIdAndStoreIdAndPeriodWithDetails(eq(10L), eq(1L), any(), any()))
                .thenReturn(List.of(a1, a2, a3));

        Payroll p1 = payroll(1_000_000, 967_000, 33_000, 0);
        Payroll p2 = payroll(1_200_000, 1_160_400, 39_600, 0);
        when(payrollRepo.findByEmployeeIdAndPeriod(eq(10L), any(), any())).thenReturn(List.of(p1, p2));

        LaborContract contract = mock(LaborContract.class);
        when(contract.getHourlyWage()).thenReturn(10_030);
        when(contract.getContractedHoursPerWeek()).thenReturn(20.0);
        when(contract.getWeeklyHolidayDay()).thenReturn("SUNDAY");
        when(contract.getStartDate()).thenReturn(LocalDate.of(2026, 1, 1));
        when(contract.getEndDate()).thenReturn(null);
        when(contract.isSigned()).thenReturn(true);
        when(laborContractService.findFor(10L, 1L)).thenReturn(List.of(contract));

        WageHistory override = mock(WageHistory.class);
        when(override.getScope()).thenReturn(WageHistory.Scope.EMPLOYEE_OVERRIDE);
        when(override.getHourlyWage()).thenReturn(11_000);
        when(override.getEffectiveFrom()).thenReturn(LocalDate.of(2026, 4, 1));
        when(override.getReason()).thenReturn("성과 반영");
        WageHistory storeDefault = mock(WageHistory.class);
        when(storeDefault.getScope()).thenReturn(WageHistory.Scope.STORE_DEFAULT);
        when(storeDefault.getHourlyWage()).thenReturn(10_030);
        when(storeDefault.getEffectiveFrom()).thenReturn(LocalDate.of(2026, 1, 1));
        when(storeDefault.getReason()).thenReturn(null);
        when(wageHistoryRepo.findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(10L, 1L))
                .thenReturn(List.of(override));
        when(wageHistoryRepo.findByScopeAndStore_IdInOrderByEffectiveFromDesc(
                eq(WageHistory.Scope.STORE_DEFAULT), any()))
                .thenReturn(List.of(storeDefault));

        EvidencePackageResponse res = service.forEmployee(1L, 10L, FROM, TO);

        assertThat(res.employeeName()).isEqualTo("김알바");
        assertThat(res.from()).isEqualTo(FROM);
        assertThat(res.to()).isEqualTo(TO);

        assertThat(res.attendance().workedDays()).isEqualTo(2);
        assertThat(res.attendance().recordCount()).isEqualTo(3);
        assertThat(res.attendance().totalWorkedHours()).isEqualTo(12.0);

        assertThat(res.payroll().payslipCount()).isEqualTo(2);
        assertThat(res.payroll().totalGrossWage()).isEqualTo(2_200_000);
        assertThat(res.payroll().totalNetWage()).isEqualTo(2_127_400);
        assertThat(res.payroll().totalDeduction()).isEqualTo(72_600);

        assertThat(res.contract().hasContract()).isTrue();
        assertThat(res.contract().hourlyWage()).isEqualTo(10_030);
        assertThat(res.contract().signed()).isTrue();

        // 시급이력: override(4/1) + storeDefault(1/1) → 최신순 정렬
        assertThat(res.wageHistory()).hasSize(2);
        assertThat(res.wageHistory().get(0).effectiveFrom()).isEqualTo(LocalDate.of(2026, 4, 1));
        assertThat(res.wageHistory().get(0).scope()).isEqualTo("EMPLOYEE_OVERRIDE");
        assertThat(res.wageHistory().get(1).scope()).isEqualTo("STORE_DEFAULT");

        assertThat(res.disclaimer()).contains("참고용");
    }

    @Test
    @DisplayName("데이터가 비어도 빈 섹션으로 안전하게 집계 + 계약 없음 처리")
    void emptyData() {
        stubName(20L, "이파트");
        when(attendanceRepo.findByEmployeeIdAndStoreIdAndPeriodWithDetails(eq(20L), eq(1L), any(), any()))
                .thenReturn(List.of());
        when(payrollRepo.findByEmployeeIdAndPeriod(eq(20L), any(), any())).thenReturn(List.of());
        when(laborContractService.findFor(20L, 1L)).thenReturn(List.of());
        when(wageHistoryRepo.findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(anyLong(), anyLong()))
                .thenReturn(List.of());
        when(wageHistoryRepo.findByScopeAndStore_IdInOrderByEffectiveFromDesc(any(), any()))
                .thenReturn(List.of());

        EvidencePackageResponse res = service.forEmployee(1L, 20L, FROM, TO);

        assertThat(res.attendance().workedDays()).isZero();
        assertThat(res.attendance().totalWorkedMinutes()).isZero();
        assertThat(res.payroll().payslipCount()).isZero();
        assertThat(res.payroll().totalGrossWage()).isZero();
        assertThat(res.contract().hasContract()).isFalse();
        assertThat(res.contract().hourlyWage()).isNull();
        assertThat(res.wageHistory()).isEmpty();
    }

    @Test
    @DisplayName("직원/이름 미상이어도 PII 없이 이름 미상으로 처리")
    void unknownName() {
        when(employeeRepo.findById(30L)).thenReturn(Optional.empty());
        when(attendanceRepo.findByEmployeeIdAndStoreIdAndPeriodWithDetails(anyLong(), anyLong(), any(), any()))
                .thenReturn(List.of());
        when(payrollRepo.findByEmployeeIdAndPeriod(anyLong(), any(), any())).thenReturn(List.of());
        when(laborContractService.findFor(anyLong(), anyLong())).thenReturn(List.of());
        when(wageHistoryRepo.findByEmployee_IdAndStore_IdOrderByEffectiveFromDesc(anyLong(), anyLong()))
                .thenReturn(List.of());
        when(wageHistoryRepo.findByScopeAndStore_IdInOrderByEffectiveFromDesc(any(), any()))
                .thenReturn(List.of());

        EvidencePackageResponse res = service.forEmployee(1L, 30L, FROM, TO);
        assertThat(res.employeeName()).isEqualTo("(이름 미상)");
    }
}
