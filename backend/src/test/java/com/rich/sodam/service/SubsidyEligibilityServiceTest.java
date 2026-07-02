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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 두루누리 자격 판정 (B7) — 10인 미만 + 월보수 기준.
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

    private Payroll payroll(int gross) {
        Payroll p = mock(Payroll.class);
        when(p.getGrossWage()).thenReturn(gross);
        return p;
    }

    @Test
    @DisplayName("10인 미만: 월보수 기준 미만 직원만 대상")
    void eligibleUnderCap() {
        EmployeeStoreRelation r1 = rel(10L, "김알바");
        EmployeeStoreRelation r2 = rel(20L, "이파트");
        when(relationRepository.findByStore_Id(eq(1L))).thenReturn(List.of(r1, r2));
        Payroll low = payroll(2_000_000);
        Payroll high = payroll(2_900_000);
        when(payrollRepository.findByEmployee_IdOrderByEndDateDesc(10L)).thenReturn(List.of(low));
        when(payrollRepository.findByEmployee_IdOrderByEndDateDesc(20L)).thenReturn(List.of(high));

        SubsidyEligibilityResponse res = service.evaluate(1L);

        assertThat(res.storeUnder10()).isTrue();
        assertThat(res.employeeCount()).isEqualTo(2);
        assertThat(res.eligibleCount()).isEqualTo(1); // 김(200만<270만) only
        assertThat(res.candidates()).hasSize(2);
        assertThat(res.disclaimer()).contains("근로복지공단");
    }

    @Test
    @DisplayName("10인 이상 사업장: 사업장 요건 미충족 → 전원 비대상")
    void storeOverLimitNotEligible() {
        List<EmployeeStoreRelation> rels = new java.util.ArrayList<>();
        for (long i = 1; i <= 10; i++) {
            rels.add(rel(i, "직원" + i));
        }
        when(relationRepository.findByStore_Id(eq(2L))).thenReturn(rels);
        for (long i = 1; i <= 10; i++) {
            Payroll p = payroll(1_500_000); // 중첩 스터빙 방지: when() 밖에서 생성
            when(payrollRepository.findByEmployee_IdOrderByEndDateDesc(i)).thenReturn(List.of(p));
        }

        SubsidyEligibilityResponse res = service.evaluate(2L);

        assertThat(res.storeUnder10()).isFalse();
        assertThat(res.eligibleCount()).isZero();
    }
}
