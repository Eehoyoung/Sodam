package com.rich.sodam.core.payroll.severance;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 퇴직금 산식 단위 테스트 (근로자퇴직급여보장법 §8).
 */
class SeveranceCalculatorTest {

    private final SeveranceCalculator calc = new SeveranceCalculator();

    @Test
    @DisplayName("1년 미만은 지급 대상 아님 → 0원")
    void underOneYear() {
        assertThat(calc.isEligible(364)).isFalse();
        assertThat(calc.estimate(100_000, 364)).isZero();
    }

    @Test
    @DisplayName("정확히 1년(365일): 평균임금 × 30 × 1")
    void exactlyOneYear() {
        assertThat(calc.isEligible(365)).isTrue();
        // 100,000 × 30 × 365/365 = 3,000,000
        assertThat(calc.estimate(100_000, 365)).isEqualTo(3_000_000L);
    }

    @Test
    @DisplayName("2년(730일): 30일분 × 2년치")
    void twoYears() {
        // 100,000 × 30 × 730/365 = 6,000,000
        assertThat(calc.estimate(100_000, 730)).isEqualTo(6_000_000L);
    }

    @Test
    @DisplayName("평균임금 0 이하면 0원")
    void zeroWage() {
        assertThat(calc.estimate(0, 730)).isZero();
        assertThat(calc.estimate(-1, 730)).isZero();
    }
}
