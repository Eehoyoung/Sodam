package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 근로시간 분해 + 휴게공제(§54) 회귀 차단.
 *
 * <p>특히 자정을 넘기는 교대근무에서 구 {@code LocalTime.plusHours(24)} 무효로 총 근로시간이
 * 음수가 되어 기본임금이 미지급되던 결함을 고정 검증한다.</p>
 */
class WorkHoursCalculatorTest {

    private final WorkHoursCalculator calculator = new WorkHoursCalculator();

    @Test
    @DisplayName("09:00~18:00 (9h) → 휴게 1h 공제 → 정상 8h")
    void standardDayWithOneHourBreak() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 18, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(8.0);
        assertThat(r.overtimeHours()).isEqualTo(0.0);
        assertThat(r.breakHours()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("자정통과 22:00~익일 06:00 (8h) → 휴게 1h → 정상 7h (구버그: 음수)")
    void overnightShiftNotNegative() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 22, 0),
                LocalDateTime.of(2026, 6, 2, 6, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(7.0);
        assertThat(r.overtimeHours()).isEqualTo(0.0);
        assertThat(r.breakHours()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("09:00~14:00 (5h) → 휴게 30분 → 정상 4.5h")
    void fiveHourGetsHalfHourBreak() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 14, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(4.5);
        assertThat(r.breakHours()).isEqualTo(0.5);
    }

    @Test
    @DisplayName("09:00~12:00 (3h) → 휴게 없음 → 정상 3h")
    void shortShiftNoBreak() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 12, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(3.0);
        assertThat(r.breakHours()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("09:00~20:00 (11h) → 휴게 1h → 정상 8h + 연장 2h")
    void longShiftHasOvertime() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 20, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(8.0);
        assertThat(r.overtimeHours()).isEqualTo(2.0);
        assertThat(r.breakHours()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("자정통과 20:00~익일 02:00 (6h) → 휴게 30분 → 정상 5.5h")
    void overnightPartialShift() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 20, 0),
                LocalDateTime.of(2026, 6, 2, 2, 0), 8.0);
        assertThat(r.regularHours()).isEqualTo(5.5);
        assertThat(r.breakHours()).isEqualTo(0.5);
    }

    @Test
    @DisplayName("퇴근이 출근보다 이르거나 같으면 0")
    void invalidIntervalReturnsZero() {
        WorkHoursResult r = calculator.calculate(
                LocalDateTime.of(2026, 6, 1, 9, 0),
                LocalDateTime.of(2026, 6, 1, 9, 0), 8.0);
        assertThat(r.paidHours()).isZero();
    }
}
