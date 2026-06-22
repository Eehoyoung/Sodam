package com.rich.sodam.service;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.dto.response.VatDeadlineResponse;
import com.rich.sodam.dto.response.WithholdingMonthlyResponse;
import com.rich.sodam.repository.PayrollRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 원천세 월 요약 + 부가세 분기 기한 (B6/T-NEW-04·06) — 합산·기한·D-day 검증.
 *
 * <p>기한·D-day는 기준일을 받는 헬퍼(buildMonthlySummary/buildVatDeadline)로 시각 고정.
 */
class WithholdingMonthlyServiceTest {

    private final PayrollRepository payrollRepository = mock(PayrollRepository.class);
    private final WithholdingMonthlyService service = new WithholdingMonthlyService(payrollRepository);

    private Payroll payroll(Integer taxAmount) {
        Payroll p = new Payroll();
        p.setTaxAmount(taxAmount);
        return p;
    }

    @Test
    @DisplayName("그 달 원천징수세액 합산 + 익월 10일 기한")
    void monthlySumAndDueDate() {
        when(payrollRepository.findByStoreIdAndPeriod(eq(1L), any(), any()))
                .thenReturn(List.of(payroll(33_000), payroll(16_500), payroll(null)));

        WithholdingMonthlyResponse res = service.monthlySummary(1L, 2026, 5);

        assertThat(res.totalWithheld()).isEqualTo(49_500);   // null은 제외
        assertThat(res.dueDate()).isEqualTo(LocalDate.of(2026, 6, 10)); // 익월 10일
        assertThat(res.year()).isEqualTo(2026);
        assertThat(res.month()).isEqualTo(5);
        assertThat(res.disclaimer()).contains("세무사");
    }

    @Test
    @DisplayName("12월 귀속 → 익년 1월 10일 기한")
    void decemberRollsToNextYear() {
        when(payrollRepository.findByStoreIdAndPeriod(eq(1L), any(), any())).thenReturn(List.of());

        WithholdingMonthlyResponse res = service.monthlySummary(1L, 2026, 12);

        assertThat(res.dueDate()).isEqualTo(LocalDate.of(2027, 1, 10));
        assertThat(res.totalWithheld()).isZero();
    }

    @Test
    @DisplayName("잘못된 월 입력 거부")
    void rejectsInvalidMonth() {
        assertThatThrownBy(() -> service.monthlySummary(1L, 2026, 13))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("D-day 계산: 기준일과 기한 사이 남은 일수")
    void daysUntilDue() {
        WithholdingMonthlyResponse res =
                service.buildMonthlySummary(1L, 2026, 5, 49_500, LocalDate.of(2026, 6, 1));
        assertThat(res.daysUntilDue()).isEqualTo(9); // 6/1 → 6/10

        WithholdingMonthlyResponse past =
                service.buildMonthlySummary(1L, 2026, 5, 0, LocalDate.of(2026, 6, 15));
        assertThat(past.daysUntilDue()).isEqualTo(-5); // 기한 경과
    }

    @Test
    @DisplayName("부가세: 기준일 이후 가장 가까운 분기 기한 선택(1·4·7·10월 25일)")
    void nextVatDeadlineWithinYear() {
        // 5월 → 다음 기한은 7월 25일
        VatDeadlineResponse may = service.buildVatDeadline(1L, LocalDate.of(2026, 5, 10));
        assertThat(may.dueDate()).isEqualTo(LocalDate.of(2026, 7, 25));
        assertThat(may.daysUntilDue()).isEqualTo(76);
        assertThat(may.quarter()).contains("2026년 1기 확정");
        assertThat(may.disclaimer()).contains("세무사");
    }

    @Test
    @DisplayName("부가세: 기한 당일은 아직 유효(오늘 포함)")
    void vatDueDateInclusiveToday() {
        VatDeadlineResponse onDue = service.buildVatDeadline(1L, LocalDate.of(2026, 7, 25));
        assertThat(onDue.dueDate()).isEqualTo(LocalDate.of(2026, 7, 25));
        assertThat(onDue.daysUntilDue()).isZero();
    }

    @Test
    @DisplayName("부가세: 10월 25일 지나면 익년 1월 25일")
    void vatRollsToNextYear() {
        VatDeadlineResponse nov = service.buildVatDeadline(1L, LocalDate.of(2026, 11, 1));
        assertThat(nov.dueDate()).isEqualTo(LocalDate.of(2027, 1, 25));
        assertThat(nov.quarter()).contains("2026년 2기 확정");
    }
}
