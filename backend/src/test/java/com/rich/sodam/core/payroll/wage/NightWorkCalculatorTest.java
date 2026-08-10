package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * L-1 회귀 차단 테스트.
 *
 * <p>구 로직({@code LocalTime.plusHours(24)})은 자정을 넘기는 교대근무에서 야간시간을 0 으로
 * 반환해 야간가산수당 전액 미지급(임금체불)을 유발했다. 본 테스트는 자정 통과 시나리오에서
 * 야간시간이 정확히 산정되는지 고정 검증한다.</p>
 */
class NightWorkCalculatorTest {

    private final NightWorkCalculator calculator = new NightWorkCalculator();
    private final LocalTime nightStart = LocalTime.of(22, 0);

    @Test
    @DisplayName("22:00~익일 06:00 풀 야간근무 → 8시간")
    void fullNightShift() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 2, 6, 0),
                nightStart);
        assertThat(hours).isEqualTo(8.0);
    }

    @Test
    @DisplayName("20:00~익일 02:00 → 야간은 22:00~02:00 구간 4시간")
    void partialNightCrossingMidnight() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 20, 0),
                LocalDateTime.of(2026, 6, 2, 2, 0),
                nightStart);
        assertThat(hours).isEqualTo(4.0);
    }

    @Test
    @DisplayName("14:00~18:00 주간근무 → 야간 0시간")
    void dayShiftHasNoNight() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 14, 0),
                LocalDateTime.of(2026, 6, 1, 18, 0),
                nightStart);
        assertThat(hours).isZero();
    }

    @Test
    @DisplayName("23:00~익일 01:00 → 2시간")
    void shortNightShift() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 23, 0),
                LocalDateTime.of(2026, 6, 2, 1, 0),
                nightStart);
        assertThat(hours).isEqualTo(2.0);
    }

    @Test
    @DisplayName("nightStart null 이면 법정 기본값(22:00) 적용")
    void usesStatutoryDefaultWhenNull() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 2, 6, 0),
                null);
        assertThat(hours).isEqualTo(8.0);
    }

    @Test
    @DisplayName("야간 시작 정책은 22시보다 늦게 저장되어도 법정 시작 시각을 놓치지 않는다")
    void legacyNightStartCannotBeLaterThanStatutoryStart() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 21, 0),
                LocalDateTime.of(2026, 6, 2, 1, 0),
                LocalTime.of(23, 0));

        assertThat(hours).isEqualTo(3.0);
    }

    @Test
    @DisplayName("야간 근로시간은 법정 무급 휴게시간을 제외한 지급시간만 계산한다")
    void rawNightHoursKeepRawOverlapForCompatibility() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 2, 6, 0),
                nightStart);

        assertThat(hours).isEqualTo(8.0);
    }

    @Test
    void payableNightHoursExcludeStatutoryUnpaidBreak() {
        double hours = calculator.calculatePayable(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 2, 6, 0),
                nightStart);

        assertThat(hours).isEqualTo(7.0);
    }

    @Test
    void payableNightBreakThresholdUsesExactDuration() {
        LocalDateTime start = LocalDateTime.of(2026, 6, 1, 22, 0);

        assertThat(calculator.calculatePayable(start, start.plusHours(3).plusMinutes(59).plusSeconds(59), nightStart))
                .isEqualTo(4.0);
        assertThat(calculator.calculatePayable(start, start.plusHours(4), nightStart)).isEqualTo(3.5);
        assertThat(calculator.calculatePayable(start, start.plusHours(7).plusMinutes(59).plusSeconds(59), nightStart))
                .isEqualTo(7.5);
        assertThat(calculator.calculatePayable(start, start.plusHours(8), nightStart)).isEqualTo(7.0);
    }

    @Test
    void invalidEarlyNightStartFallsBackToStatutoryStart() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 17, 0),
                LocalTime.MIDNIGHT);

        assertThat(hours).isZero();
    }

    @Test
    void legacyEarlierStartAlsoFallsBackToStatutoryWindow() {
        double hours = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 21, 30),
                LocalDateTime.of(2026, 6, 1, 22, 30),
                LocalTime.of(21, 0));

        assertThat(hours).isEqualTo(0.5);
    }

    @Test
    @DisplayName("퇴근이 출근보다 이르거나 같으면 0")
    void invalidIntervalReturnsZero() {
        assertThat(calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 1, 22, 0),
                nightStart)).isZero();
    }
}
