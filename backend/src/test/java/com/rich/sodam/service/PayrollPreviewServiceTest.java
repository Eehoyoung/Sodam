package com.rich.sodam.service;

import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculatorResolver;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.FullTimeWeekdayWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.IneligibleWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.ShiftScheduleWeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.strategy.ShortTimeWeeklyAllowanceCalculator;
import com.rich.sodam.dto.response.PayrollPreviewResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 급여 미리보기(D0 aha, A1) — 주휴 포함 예상급여 산정. 기존 주휴 전략 재사용 검증.
 */
class PayrollPreviewServiceTest {

    private final PayrollPreviewService service = new PayrollPreviewService(
            new WeeklyAllowanceCalculatorResolver(List.of(
                    new FullTimeWeekdayWeeklyAllowanceCalculator(),
                    new ShortTimeWeeklyAllowanceCalculator(),
                    new ShiftScheduleWeeklyAllowanceCalculator(),
                    new IneligibleWeeklyAllowanceCalculator())));

    @Test
    @DisplayName("주 15h·시급 10,030 → 주휴 발생, 주휴시간 3h")
    void shortTimeEligible() {
        PayrollPreviewResponse r = service.preview(10_030, 15);

        assertThat(r.weeklyAllowanceEligible()).isTrue();
        assertThat(r.weeklyBasic()).isEqualTo(150_450);          // 15 × 10,030
        assertThat(r.weeklyAllowance()).isEqualTo(30_090);       // (15/40)×8=3h × 10,030
        assertThat(r.monthlyGross()).isEqualTo(r.monthlyBasic() + r.monthlyAllowance());
        assertThat(r.monthlyGross()).isGreaterThan(r.monthlyBasic()); // 주휴 포함이 기본보다 큼
        assertThat(r.disclaimer()).contains("참고용");
    }

    @Test
    @DisplayName("주 10h → 주휴 미발생(15h 미만)")
    void belowThresholdNotEligible() {
        PayrollPreviewResponse r = service.preview(10_030, 10);

        assertThat(r.weeklyAllowanceEligible()).isFalse();
        assertThat(r.weeklyAllowance()).isZero();
        assertThat(r.monthlyAllowance()).isZero();
        assertThat(r.weeklyBasic()).isEqualTo(100_300);
    }

    @Test
    @DisplayName("주 40h(풀타임) → 주휴 8h 상한")
    void fullTimeCappedAtEightHours() {
        PayrollPreviewResponse r = service.preview(10_000, 40);

        assertThat(r.weeklyAllowanceEligible()).isTrue();
        assertThat(r.weeklyAllowance()).isEqualTo(80_000);       // 8h × 10,000
    }

    @Test
    @DisplayName("음수 입력 거부")
    void rejectsNegative() {
        assertThatThrownBy(() -> service.preview(-1, 10))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
