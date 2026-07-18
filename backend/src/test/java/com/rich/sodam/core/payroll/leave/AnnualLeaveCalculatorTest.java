package com.rich.sodam.core.payroll.leave;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 연차유급휴가 §60 산식 검증.
 */
class AnnualLeaveCalculatorTest {

    private final AnnualLeaveCalculator calc = new AnnualLeaveCalculator();

    @Test
    @DisplayName("§60② 1년 미만: 만근 개월당 1일, 최대 11일")
    void firstYearMonthly() {
        assertThat(calc.firstYearMonthly(1, true)).isEqualTo(1);
        assertThat(calc.firstYearMonthly(11, true)).isEqualTo(11);
        assertThat(calc.firstYearMonthly(12, true)).isEqualTo(11); // 상한
    }

    @Test
    @DisplayName("§60① 1년 80% 이상: 15일")
    void oneYearFull() {
        assertThat(calc.annual(1, 0.9, true)).isEqualTo(15);
    }

    @Test
    @DisplayName("§60④ 3년차 16일, 5년차 17일, 가산은 2년마다")
    void seniorityAddition() {
        assertThat(calc.annual(2, 1.0, true)).isEqualTo(15); // 2년차 가산 없음
        assertThat(calc.annual(3, 1.0, true)).isEqualTo(16);
        assertThat(calc.annual(5, 1.0, true)).isEqualTo(17);
    }

    @Test
    @DisplayName("§60④ 상한 25일")
    void maxCap() {
        assertThat(calc.annual(30, 1.0, true)).isEqualTo(25);
    }

    @Test
    @DisplayName("출근율 80% 미만 → 0 (월 단위로 별도 산정)")
    void belowThreshold() {
        assertThat(calc.annual(1, 0.79, true)).isZero();
    }

    @Test
    @DisplayName("5인 미만 → 연차 미적용(0)")
    void smallBusinessExempt() {
        assertThat(calc.annual(5, 1.0, false)).isZero();
        assertThat(calc.firstYearMonthly(11, false)).isZero();
    }

    // ─── §18③ 주 소정근로시간 15시간 미만 체크(weeklyHours 오버로드) ──────────

    @Test
    @DisplayName("§18③ 주 15시간 미만은 1년 미만 월단위 연차도 0")
    void firstYearMonthly_belowWeeklyHoursThreshold_zero() {
        assertThat(calc.firstYearMonthly(5, true, 14.9)).isZero();
    }

    @Test
    @DisplayName("§18③ 주 15시간 이상이면 기존과 동일하게 산정")
    void firstYearMonthly_aboveWeeklyHoursThreshold_sameAsBase() {
        assertThat(calc.firstYearMonthly(5, true, 15.0)).isEqualTo(5);
        assertThat(calc.firstYearMonthly(5, true, 40.0)).isEqualTo(5);
    }

    @Test
    @DisplayName("§18③ 주 15시간 미만은 1년 이상 연차도 0")
    void annual_belowWeeklyHoursThreshold_zero() {
        assertThat(calc.annual(3, 1.0, true, 14.9)).isZero();
    }

    @Test
    @DisplayName("§18③ 주 15시간 이상이면 기존과 동일하게 산정")
    void annual_aboveWeeklyHoursThreshold_sameAsBase() {
        assertThat(calc.annual(3, 1.0, true, 15.0)).isEqualTo(16);
    }

    @Test
    @DisplayName("isWeeklyHoursEligible 경계값(15시간)")
    void isWeeklyHoursEligible_boundary() {
        assertThat(AnnualLeaveCalculator.isWeeklyHoursEligible(15.0)).isTrue();
        assertThat(AnnualLeaveCalculator.isWeeklyHoursEligible(14.999)).isFalse();
    }

    // ─── 비례연차(단시간근로자, §18③) ────────────────────────────────────

    @Test
    @DisplayName("비례연차: 주 20시간(=40시간의 절반) → 통상근로자 15일의 절반을 시간으로 환산(60시간)")
    void proportionalHours_halfTime() {
        assertThat(calc.proportionalHours(15, 20.0)).isEqualTo(60.0);
    }

    @Test
    @DisplayName("비례연차: 주 40시간 이상은 비례 없이 통상근로자와 동일(일수×8시간)")
    void proportionalHours_fullTimeNoProration() {
        assertThat(calc.proportionalHours(15, 40.0)).isEqualTo(120.0);
        assertThat(calc.proportionalHours(15, 50.0)).isEqualTo(120.0); // 40h 캡
    }

    @Test
    @DisplayName("비례연차: 주 15시간(최소 적용 경계) → 15/40 비율")
    void proportionalHours_minimumEligible() {
        assertThat(calc.proportionalHours(11, 15.0)).isEqualTo(11 * 15.0 / 40.0 * 8.0);
    }

    // ─── 기간제 정확히 1년 계약 만료 예외(대법 2021다227100) ────────────────

    @Test
    @DisplayName("기간제 정확히 1년 계약 만료 → 15일 대신 11일 상한만 인정")
    void annualConsideringFixedTermException_exactOneYear_capsAtEleven() {
        assertThat(calc.annualConsideringFixedTermException(1, 1.0, true, 40.0, true))
                .isEqualTo(11);
    }

    @Test
    @DisplayName("기간제 예외가 아니면 기존 annual() 산식 그대로")
    void annualConsideringFixedTermException_notException_fallsBackToAnnual() {
        assertThat(calc.annualConsideringFixedTermException(1, 1.0, true, 40.0, false))
                .isEqualTo(15);
        assertThat(calc.annualConsideringFixedTermException(3, 1.0, true, 40.0, false))
                .isEqualTo(16);
    }

    @Test
    @DisplayName("기간제 예외여도 5인 미만·주 15시간 미만이면 0")
    void annualConsideringFixedTermException_exception_stillRespectsOtherGates() {
        assertThat(calc.annualConsideringFixedTermException(1, 1.0, false, 40.0, true))
                .isZero();
        assertThat(calc.annualConsideringFixedTermException(1, 1.0, true, 14.9, true))
                .isZero();
    }
}
