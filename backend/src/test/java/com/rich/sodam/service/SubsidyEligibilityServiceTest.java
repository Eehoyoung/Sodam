package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.EmployeeStoreRelation;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.SubsidyEligibilityResponse;
import com.rich.sodam.repository.EmployeeStoreRelationRepository;
import com.rich.sodam.repository.PayrollRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 두루누리 자격 판정 (B7) — 10인 미만 + 월보수 기준.
 *
 * <p>N+1 회귀 방지: 직원 수와 무관하게 {@code findByEmployee_IdInOrderByEndDateDesc}가
 * 정확히 1회만 호출되고, 개별 조회 메서드는 호출되지 않아야 한다.
 */
class SubsidyEligibilityServiceTest {

    private final EmployeeStoreRelationRepository relationRepository = mock(EmployeeStoreRelationRepository.class);
    private final PayrollRepository payrollRepository = mock(PayrollRepository.class);
    private final SubsidyEligibilityService service =
            new SubsidyEligibilityService(relationRepository, payrollRepository);

    private EmployeeStoreRelation rel(long empId, String name) {
        User u = mock(User.class);
        when(u.getName()).thenReturn(name);
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(empId);
        when(e.getUser()).thenReturn(u);
        EmployeeStoreRelation r = mock(EmployeeStoreRelation.class);
        when(r.getEmployeeProfile()).thenReturn(e);
        when(r.getIsActive()).thenReturn(true);
        return r;
    }

    private Payroll payroll(long employeeId, int gross) {
        Payroll p = mock(Payroll.class);
        EmployeeProfile e = mock(EmployeeProfile.class);
        when(e.getId()).thenReturn(employeeId);
        when(p.getEmployee()).thenReturn(e);
        when(p.getGrossWage()).thenReturn(gross);
        return p;
    }

    @Test
    @DisplayName("10인 미만: 월보수 기준 미만 직원만 대상 (배치 조회 1회)")
    void eligibleUnderCap() {
        EmployeeStoreRelation r1 = rel(10L, "김알바");
        EmployeeStoreRelation r2 = rel(20L, "이파트");
        when(relationRepository.findByStore_Id(eq(1L))).thenReturn(List.of(r1, r2));
        Payroll low = payroll(10L, 2_000_000);
        Payroll high = payroll(20L, 2_900_000);
        when(payrollRepository.findByEmployee_IdInOrderByEndDateDesc(anyList()))
                .thenReturn(List.of(high, low));

        SubsidyEligibilityResponse res = service.evaluate(1L);

        assertThat(res.storeUnder10()).isTrue();
        assertThat(res.employeeCount()).isEqualTo(2);
        assertThat(res.eligibleCount()).isEqualTo(1); // 김(200만<270만) only
        assertThat(res.candidates()).hasSize(2);
        assertThat(res.disclaimer()).contains("근로복지공단");

        verify(payrollRepository, times(1)).findByEmployee_IdInOrderByEndDateDesc(anyList());
        verify(payrollRepository, never()).findByEmployee_IdOrderByEndDateDesc(any());
    }

    @Test
    @DisplayName("10인 이상 사업장: 사업장 요건 미충족 → 전원 비대상, 배치 조회 1회만 발생 (N+1 회귀 방지)")
    void storeOverLimitNotEligible() {
        List<EmployeeStoreRelation> rels = new java.util.ArrayList<>();
        for (long i = 1; i <= 10; i++) {
            rels.add(rel(i, "직원" + i));
        }
        when(relationRepository.findByStore_Id(eq(2L))).thenReturn(rels);
        List<Payroll> payrolls = new java.util.ArrayList<>();
        for (long i = 1; i <= 10; i++) {
            payrolls.add(payroll(i, 1_500_000));
        }
        when(payrollRepository.findByEmployee_IdInOrderByEndDateDesc(anyList())).thenReturn(payrolls);

        SubsidyEligibilityResponse res = service.evaluate(2L);

        assertThat(res.storeUnder10()).isFalse();
        assertThat(res.eligibleCount()).isZero();

        // 직원이 10명이어도 배치 조회는 정확히 1회만 호출돼야 한다 (N+1 회귀 방지).
        verify(payrollRepository, times(1)).findByEmployee_IdInOrderByEndDateDesc(anyList());
        verify(payrollRepository, never()).findByEmployee_IdOrderByEndDateDesc(any());
    }

    @Test
    @DisplayName("급여 이력이 없는 직원은 월보수 null → 판정 보류(비대상)")
    void noPayrollHistoryTreatedAsNull() {
        EmployeeStoreRelation r1 = rel(30L, "신입");
        when(relationRepository.findByStore_Id(eq(3L))).thenReturn(List.of(r1));
        when(payrollRepository.findByEmployee_IdInOrderByEndDateDesc(anyList())).thenReturn(List.of());

        SubsidyEligibilityResponse res = service.evaluate(3L);

        assertThat(res.eligibleCount()).isZero();
        assertThat(res.candidates()).hasSize(1);
        assertThat(res.candidates().get(0).monthlyWageEstimate()).isNull();
    }
}
