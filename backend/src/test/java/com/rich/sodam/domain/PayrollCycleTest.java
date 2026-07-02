package com.rich.sodam.domain;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PayrollCycleTest {

    @Test
    @DisplayName("1자리 일 입력은 2자리로 0 패딩된다")
    void zeroPadsSingleDigitDay() {
        PayrollCycle c = PayrollCycle.of(
                MonthOffset.PREV_MONTH, 1,
                MonthOffset.CURRENT_MONTH, 9, false,
                MonthOffset.NEXT_MONTH, 5, false);

        assertThat(c.getStartDay()).isEqualTo("01");
        assertThat(c.getEndDay()).isEqualTo("09");
        assertThat(c.getPayDay()).isEqualTo("05");
    }

    @Test
    @DisplayName("말일 플래그가 켜지면 일은 null로 저장된다")
    void lastDayNullsOutDay() {
        PayrollCycle c = PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 1,
                MonthOffset.CURRENT_MONTH, 25, true,   // endLastDay
                MonthOffset.NEXT_MONTH, 10, true);     // payDayLastDay

        assertThat(c.getEndLastDay()).isTrue();
        assertThat(c.getEndDay()).isNull();
        assertThat(c.getPayDayLastDay()).isTrue();
        assertThat(c.getPayDay()).isNull();
    }

    @Test
    @DisplayName("시작 기준월은 전월/당월만 허용한다(익월이면 예외)")
    void rejectsInvalidStartOffset() {
        assertThatThrownBy(() -> PayrollCycle.of(
                MonthOffset.NEXT_MONTH, 1,
                MonthOffset.CURRENT_MONTH, 25, false,
                MonthOffset.NEXT_MONTH, 10, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("마감/지급 기준월은 당월/익월만 허용한다(전월이면 예외)")
    void rejectsInvalidEndOffset() {
        assertThatThrownBy(() -> PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 1,
                MonthOffset.PREV_MONTH, 25, false,
                MonthOffset.NEXT_MONTH, 10, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("일 범위(1~31)를 벗어나면 예외")
    void rejectsOutOfRangeDay() {
        assertThatThrownBy(() -> PayrollCycle.of(
                MonthOffset.PREV_MONTH, 0,
                MonthOffset.CURRENT_MONTH, 25, false,
                MonthOffset.NEXT_MONTH, 10, false))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PayrollCycle.of(
                MonthOffset.PREV_MONTH, 1,
                MonthOffset.CURRENT_MONTH, 32, false,
                MonthOffset.NEXT_MONTH, 10, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("말일이 아니면 일은 필수")
    void requiresDayWhenNotLastDay() {
        assertThatThrownBy(() -> PayrollCycle.of(
                MonthOffset.PREV_MONTH, 1,
                MonthOffset.CURRENT_MONTH, null, false,
                MonthOffset.NEXT_MONTH, 10, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("전월21일~당월20일, 익월5일 지급을 기준월 2026-06 으로 해석한다")
    void resolvesDatesForPayMonth() {
        PayrollCycle c = PayrollCycle.of(
                MonthOffset.PREV_MONTH, 21,
                MonthOffset.CURRENT_MONTH, 20, false,
                MonthOffset.NEXT_MONTH, 5, false);

        YearMonth pm = YearMonth.of(2026, 6);
        assertThat(c.resolveStart(pm)).isEqualTo(LocalDate.of(2026, 5, 21));
        assertThat(c.resolveEnd(pm)).isEqualTo(LocalDate.of(2026, 6, 20));
        assertThat(c.resolvePayDate(pm)).isEqualTo(LocalDate.of(2026, 7, 5));
    }

    @Test
    @DisplayName("당월1일~당월말일(말일), 익월10일 지급을 기준월 2026-06 으로 해석한다")
    void resolvesLastDayEnd() {
        PayrollCycle c = PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 1,
                MonthOffset.CURRENT_MONTH, null, true,  // 당월 말일
                MonthOffset.NEXT_MONTH, 10, false);

        YearMonth pm = YearMonth.of(2026, 6);
        assertThat(c.resolveStart(pm)).isEqualTo(LocalDate.of(2026, 6, 1));
        assertThat(c.resolveEnd(pm)).isEqualTo(LocalDate.of(2026, 6, 30));
        assertThat(c.resolvePayDate(pm)).isEqualTo(LocalDate.of(2026, 7, 10));
    }

    @Test
    @DisplayName("31일 지정인데 그 달이 더 짧으면 말일로 클램프한다(2월=28/29)")
    void clampsDayToMonthLength() {
        PayrollCycle c = PayrollCycle.of(
                MonthOffset.CURRENT_MONTH, 31,
                MonthOffset.CURRENT_MONTH, 31, false,
                MonthOffset.CURRENT_MONTH, 31, false);

        assertThat(c.resolveStart(YearMonth.of(2026, 2))).isEqualTo(LocalDate.of(2026, 2, 28));
    }
}
