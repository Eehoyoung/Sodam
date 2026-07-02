package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * L-2 회귀 차단 테스트.
 *
 * <p>구 로직은 야간시간에 1.5 를 통째로 더해 기본임금을 이중 지급(연장+야간 시 최대 3~4배)했다.
 * 본 계산기는 야간가산을 0.5(가산분만)로 분리한다.</p>
 */
class DailyWageCalculatorTest {

    private final DailyWageCalculator calculator = new DailyWageCalculator();
    private static final int WAGE = 10_000;

    @Test
    @DisplayName("정상근로만: 8h × 시급 × 1.0")
    void regularOnly() {
        DailyWageResult r = calculator.calculate(WAGE, 8, 0, 0, true);
        assertThat(r.regularWage()).isEqualTo(80_000);
        assertThat(r.overtimeWage()).isZero();
        assertThat(r.nightWorkWage()).isZero();
    }

    @Test
    @DisplayName("연장근로: 2h × 시급 × 1.5 = 30,000(가산 포함)")
    void overtimePremium() {
        DailyWageResult r = calculator.calculate(WAGE, 8, 2, 0, true);
        assertThat(r.overtimeWage()).isEqualTo(30_000);
    }

    @Test
    @DisplayName("야간가산은 0.5 가산분만(이중지급 금지): 8h 야간 → 40,000")
    void nightIsPremiumPortionOnly() {
        DailyWageResult r = calculator.calculate(WAGE, 8, 0, 8, true);
        assertThat(r.nightWorkWage()).isEqualTo(40_000);
    }

    @Test
    @DisplayName("연장+야간 2h: 연장 1.5(30,000) + 야간 0.5(10,000), 4배 이중가산 아님")
    void overtimeAndNightNotDoubleCounted() {
        DailyWageResult r = calculator.calculate(WAGE, 8, 2, 2, true);
        assertThat(r.overtimeWage()).isEqualTo(30_000);
        assertThat(r.nightWorkWage()).isEqualTo(10_000);
    }

    @Test
    @DisplayName("5인 미만: 연장·야간 가산 제외(기본임금만)")
    void smallBusinessNoPremium() {
        DailyWageResult r = calculator.calculate(WAGE, 8, 2, 2, false);
        assertThat(r.overtimeWage()).isEqualTo(20_000); // 2h × 1.0
        assertThat(r.nightWorkWage()).isZero();
    }

    @Test
    @DisplayName("휴일근로 8h 이내: 시급 × 1.5 (§56②)")
    void holidayWithin8h() {
        assertThat(calculator.holidayWage(WAGE, 8, true)).isEqualTo(120_000);
    }

    @Test
    @DisplayName("휴일근로 10h: 8h×1.5 + 2h×2.0 = 160,000")
    void holidayOver8h() {
        assertThat(calculator.holidayWage(WAGE, 10, true)).isEqualTo(160_000);
    }

    @Test
    @DisplayName("5인 미만 휴일근로: 가산 없이 기본 100%")
    void holidaySmallBusiness() {
        assertThat(calculator.holidayWage(WAGE, 10, false)).isEqualTo(100_000);
    }

    @Test
    @DisplayName("휴일근로 0시간 → 0")
    void holidayZero() {
        assertThat(calculator.holidayWage(WAGE, 0, true)).isZero();
    }
}
