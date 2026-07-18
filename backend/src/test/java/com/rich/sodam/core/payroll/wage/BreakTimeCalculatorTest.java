package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 근로기준법 §54 법정 최소 휴게시간 자동 산출/자동 배치 계산기 검증 — 4h/8h 경계값,
 * 야간(자정 넘김) 시프트, 자동 배치가 실제 근무 구간 "도중"에 오는지 포함.
 */
class BreakTimeCalculatorTest {

    @Test
    @DisplayName("4시간 미만은 법정 휴게 의무가 없다(0분)")
    void underFourHours_noRequiredBreak() {
        assertThat(BreakTimeCalculator.requiredBreakMinutes(3 * 60 + 59)).isZero();
    }

    @Test
    @DisplayName("정확히 4시간이면 30분 이상 휴게가 필요하다(경계값)")
    void exactlyFourHours_requires30Minutes() {
        assertThat(BreakTimeCalculator.requiredBreakMinutes(4 * 60)).isEqualTo(30);
    }

    @Test
    @DisplayName("4~8시간 사이는 30분 휴게가 필요하다")
    void betweenFourAndEightHours_requires30Minutes() {
        assertThat(BreakTimeCalculator.requiredBreakMinutes(6 * 60)).isEqualTo(30);
        assertThat(BreakTimeCalculator.requiredBreakMinutes(8 * 60 - 1)).isEqualTo(30);
    }

    @Test
    @DisplayName("정확히 8시간이면 60분 이상 휴게가 필요하다(경계값)")
    void exactlyEightHours_requires60Minutes() {
        assertThat(BreakTimeCalculator.requiredBreakMinutes(8 * 60)).isEqualTo(60);
    }

    @Test
    @DisplayName("8시간 초과는 60분 휴게가 필요하다")
    void overEightHours_requires60Minutes() {
        assertThat(BreakTimeCalculator.requiredBreakMinutes(11 * 60)).isEqualTo(60);
    }

    @Test
    @DisplayName("11:00~22:00(11시간) 근무는 60분 휴게를 근무 정중앙(16:00~17:00)에 자동 배치한다")
    void elevenToTwentyTwo_autoPlacesBreakAtMidpoint() {
        Optional<BreakTimeCalculator.BreakWindow> window =
                BreakTimeCalculator.autoBreakWindow(LocalTime.of(11, 0), LocalTime.of(22, 0));

        assertThat(window).isPresent();
        assertThat(window.get().start()).isEqualTo(LocalTime.of(16, 0));
        assertThat(window.get().end()).isEqualTo(LocalTime.of(17, 0));
    }

    @Test
    @DisplayName("4시간 미만 근무는 자동 휴게를 배치하지 않는다")
    void underFourHours_noAutoWindow() {
        Optional<BreakTimeCalculator.BreakWindow> window =
                BreakTimeCalculator.autoBreakWindow(LocalTime.of(9, 0), LocalTime.of(12, 0));

        assertThat(window).isEmpty();
    }

    @Test
    @DisplayName("자정을 넘기는 야간 시프트(20:00~05:00, 9시간)도 근무 구간 도중에 60분 휴게를 배치한다")
    void overnightShift_placesBreakDuringWork() {
        Optional<BreakTimeCalculator.BreakWindow> window =
                BreakTimeCalculator.autoBreakWindow(LocalTime.of(20, 0), LocalTime.of(5, 0));

        assertThat(window).isPresent();
        // 9시간 근무의 정중앙 60분 = 20:00 + 240분 = 00:00 ~ 01:00
        assertThat(window.get().start()).isEqualTo(LocalTime.of(0, 0));
        assertThat(window.get().end()).isEqualTo(LocalTime.of(1, 0));
    }

    @Test
    @DisplayName("자동 배치된 휴게는 항상 시업 이후·종업 이전(근로시간 도중)이다 — WorkScheduleCalculator 재검증 통과")
    void autoWindow_isAlwaysDuringWork_andPassesStructuralValidation() {
        WorkScheduleDay withoutBreak = new WorkScheduleDay(
                DayOfWeek.MONDAY, LocalTime.of(11, 0), LocalTime.of(22, 0), null, null);

        List<WorkScheduleDay> filled = BreakTimeCalculator.autoFillMissingBreaks(List.of(withoutBreak));

        // WorkScheduleCalculator 가 "휴게가 근무 구간 밖" 이면 예외를 던지므로, 통과 자체가 검증이다.
        WorkScheduleCalculator.WeeklyStats stats = WorkScheduleCalculator.weeklyStats(filled);
        assertThat(stats.weeklyActualHours()).isEqualTo(10.0); // 11시간 − 60분 휴게
    }

    @Test
    @DisplayName("이미 휴게가 입력된 요일은 자동 산출로 덮어쓰지 않는다(수동 입력 우선)")
    void existingBreak_isNotOverwritten() {
        WorkScheduleDay withManualBreak = new WorkScheduleDay(
                DayOfWeek.MONDAY, LocalTime.of(11, 0), LocalTime.of(22, 0),
                LocalTime.of(14, 0), LocalTime.of(15, 30));

        List<WorkScheduleDay> filled = BreakTimeCalculator.autoFillMissingBreaks(List.of(withManualBreak));

        assertThat(filled.get(0).breakStartTime()).isEqualTo(LocalTime.of(14, 0));
        assertThat(filled.get(0).breakEndTime()).isEqualTo(LocalTime.of(15, 30));
    }

    @Test
    @DisplayName("4시간 미만 근무일은 휴게를 비워 둔 채로 둔다")
    void shortDay_staysWithoutBreak() {
        WorkScheduleDay shortDay = new WorkScheduleDay(
                DayOfWeek.SUNDAY, LocalTime.of(9, 0), LocalTime.of(12, 0), null, null);

        List<WorkScheduleDay> filled = BreakTimeCalculator.autoFillMissingBreaks(List.of(shortDay));

        assertThat(filled.get(0).breakStartTime()).isNull();
        assertThat(filled.get(0).breakEndTime()).isNull();
    }
}
