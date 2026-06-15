package com.rich.sodam.core.payroll.deduction;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 4대보험 근로자 부담 공제 계산 검증(2026 요율) + 명세서 항목별 내역(§48②).
 */
class SocialInsuranceCalculatorTest {

    private final SocialInsuranceCalculator calculator = new SocialInsuranceCalculator();

    @Test
    @DisplayName("국민연금 4.75%: 보수 200만 → 95,000원")
    void nationalPension() {
        assertThat(calculator.nationalPension(2_000_000)).isEqualTo(95_000);
    }

    @Test
    @DisplayName("국민연금 하한 캡: 보수 30만(<40만) → 하한 40만 기준 19,000원")
    void nationalPensionFloorCap() {
        assertThat(calculator.nationalPension(300_000)).isEqualTo(19_000);
    }

    @Test
    @DisplayName("국민연금 상한 캡: 보수 700만(>637만) → 상한 637만 기준 302,575원")
    void nationalPensionCeilingCap() {
        assertThat(calculator.nationalPension(7_000_000)).isEqualTo(302_575);
    }

    @Test
    @DisplayName("건강보험 3.595%: 보수 200만 → 71,900원")
    void healthInsurance() {
        assertThat(calculator.healthInsurance(2_000_000)).isEqualTo(71_900);
    }

    @Test
    @DisplayName("장기요양: 건강보험료 × 0.13139 (보수월액 아님)")
    void longTermCareOnHealthPremium() {
        int health = calculator.healthInsurance(2_000_000); // 71,900
        int expected = (int) (health * 0.13139); // 9,446
        assertThat(calculator.longTermCare(2_000_000)).isEqualTo(expected);
    }

    @Test
    @DisplayName("고용보험 0.9%: 보수 200만 → 18,000원")
    void employmentInsurance() {
        assertThat(calculator.employmentInsurance(2_000_000)).isEqualTo(18_000);
    }

    @Test
    @DisplayName("항목별 내역 합계 = 총공제액")
    void breakdownSumsToTotal() {
        DeductionBreakdown b = calculator.breakdown(2_000_000);
        assertThat(b.total()).isEqualTo(calculator.totalEmployeeDeduction(2_000_000));
        assertThat(b.nationalPension()).isEqualTo(95_000);
        assertThat(b.employmentInsurance()).isEqualTo(18_000);
    }
}
