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
}
