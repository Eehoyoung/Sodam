package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeProfile;
import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.response.WithholdingStatementResponse;
import com.rich.sodam.repository.PayrollRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 간이지급명세서 자료 집계 (A2) — 인별 연간 합산 검증.
 */
class WithholdingStatementServiceTest {

    private final PayrollRepository repo = mock(PayrollRepository.class);
    private final WithholdingStatementService service = new WithholdingStatementService(repo);

    private Payroll payroll(long empId, String name, int gross, int tax) {
        User u = mock(User.class);
        when(u.getName()).thenReturn(name);
        EmployeeProfile emp = mock(EmployeeProfile.class);
        when(emp.getId()).thenReturn(empId);
        when(emp.getUser()).thenReturn(u);
        Payroll p = mock(Payroll.class);
        when(p.getEmployee()).thenReturn(emp);
        when(p.getGrossWage()).thenReturn(gross);
        when(p.getTaxAmount()).thenReturn(tax);
        return p;
    }

    @Test
    @DisplayName("인별 지급총액·원천징수 합산 + 매장 합계")
    void aggregatesPerEmployee() {
        // 모킹을 먼저 생성(중첩 스터빙 방지) 후 전달
        Payroll p1 = payroll(10, "김알바", 1_000_000, 33_000);
        Payroll p2 = payroll(10, "김알바", 1_200_000, 39_600);
        Payroll p3 = payroll(20, "이파트", 800_000, 26_400);
        when(repo.findByStoreIdAndPeriod(eq(1L), any(), any())).thenReturn(List.of(p1, p2, p3));

        WithholdingStatementResponse res = service.forYear(1L, 2026);

        assertThat(res.year()).isEqualTo(2026);
        assertThat(res.employeeCount()).isEqualTo(2);
        assertThat(res.totalPaid()).isEqualTo(3_000_000);
        assertThat(res.totalWithheld()).isEqualTo(99_000);

        WithholdingStatementResponse.EmployeeLine kim = res.items().stream()
                .filter(i -> i.employeeId() == 10L).findFirst().orElseThrow();
        assertThat(kim.employeeName()).isEqualTo("김알바");
        assertThat(kim.paidTotal()).isEqualTo(2_200_000);
        assertThat(kim.withheldTotal()).isEqualTo(72_600);
        assertThat(res.disclaimer()).contains("참고용");
    }

    @Test
    @DisplayName("급여 없으면 빈 집계")
    void emptyWhenNoPayroll() {
        when(repo.findByStoreIdAndPeriod(eq(2L), any(), any())).thenReturn(List.of());
        WithholdingStatementResponse res = service.forYear(2L, 2026);
        assertThat(res.employeeCount()).isZero();
        assertThat(res.totalPaid()).isZero();
        assertThat(res.items()).isEmpty();
    }
}
