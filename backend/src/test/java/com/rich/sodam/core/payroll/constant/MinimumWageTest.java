package com.rich.sodam.core.payroll.constant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * L-3 최저임금 미달 차단 — 판정 로직 검증.
 */
class MinimumWageTest {

    @Test
    @DisplayName("2026 최저임금은 10,320원")
    void hourly2026() {
        assertThat(MinimumWage.hourlyFor(2026).intValue()).isEqualTo(10_320);
    }

    @Test
    @DisplayName("미등록 연도는 가장 최근 고시값으로 보수적 폴백")
    void fallbackToLatest() {
        assertThat(MinimumWage.hourlyFor(2099).intValue()).isEqualTo(10_320);
    }

    @Test
    @DisplayName("정확히 최저임금이면 통과")
    void exactMinimumPasses() {
        assertThat(MinimumWage.isAtLeastMinimum(10_320, 2026)).isTrue();
    }

    @Test
    @DisplayName("1원이라도 미달이면 차단")
    void belowMinimumBlocked() {
        assertThat(MinimumWage.isAtLeastMinimum(10_319, 2026)).isFalse();
    }

    @Test
    @DisplayName("최저임금 초과는 통과")
    void aboveMinimumPasses() {
        assertThat(MinimumWage.isAtLeastMinimum(15_000, 2026)).isTrue();
    }
}
