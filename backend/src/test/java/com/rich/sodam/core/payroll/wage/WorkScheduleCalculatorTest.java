package com.rich.sodam.core.payroll.wage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/**
 * 요일별 스케줄 → 주 단위 집계 경계값 테스트.
 * 야간(자정 넘김) 교집합, 휴게 야간대 차감, 일/주 기준 연장 이중계상 금지, 구조 검증.
 */
class WorkScheduleCalculatorTest {

    private static WorkScheduleDay day(DayOfWeek d, String start, String end) {
        return new WorkScheduleDay(d, LocalTime.parse(start), LocalTime.parse(end), null, null);
    }

    private static WorkScheduleDay day(DayOfWeek d, String start, String end, String bs, String be) {
        return new WorkScheduleDay(d, LocalTime.parse(start), LocalTime.parse(end),
                LocalTime.parse(bs), LocalTime.parse(be));
    }

    @Test
    @DisplayName("케이스 E — 자정 넘김(20:00~05:00) + 야간대 휴게(00:00~01:00): 실근로 8h, 야간 6h(교집합 7h − 휴게 1h)")
    void overnightShiftWithBreakInsideNightWindow() {
        var stats = WorkScheduleCalculator.weeklyStats(List.of(
                day(DayOfWeek.SUNDAY, "20:00", "05:00", "00:00", "01:00")));

        assertThat(stats.weeklyActualHours()).isEqualTo(8.0);
        assertThat(stats.weeklyNightHours()).isEqualTo(6.0); // 22~05 = 7h, 휴게 00~01 차감
        assertThat(stats.weeklyOvertimeHours()).isEqualTo(0.0); // 일 8h 이내
        assertThat(stats.weeklyContractedHours()).isEqualTo(8.0);
    }

    @Test
    @DisplayName("자정 넘김 휴게 없음(20:00~05:00): 실근로 9h, 야간 7h(22~06 중 22~05)")
    void overnightShiftWithoutBreak() {
        var stats = WorkScheduleCalculator.weeklyStats(List.of(day(DayOfWeek.FRIDAY, "20:00", "05:00")));

        assertThat(stats.weeklyActualHours()).isEqualTo(9.0);
        assertThat(stats.weeklyNightHours()).isEqualTo(7.0);
        assertThat(stats.weeklyOvertimeHours()).isEqualTo(1.0); // 일 8h 초과 1h
    }

    @Test
    @DisplayName("새벽 시프트(03:00~09:00)는 당일 00~06시 야간창과 교차한다(야간 3h)")
    void earlyMorningShiftIntersectsDawnNightWindow() {
        var stats = WorkScheduleCalculator.weeklyStats(List.of(day(DayOfWeek.MONDAY, "03:00", "09:00")));

        assertThat(stats.weeklyNightHours()).isEqualTo(3.0); // 03~06시
    }

    @Test
    @DisplayName("22:00 정각 종료는 야간 0h — 야간창 경계값")
    void endingExactlyAtTenPmHasNoNight() {
        var stats = WorkScheduleCalculator.weeklyStats(List.of(day(DayOfWeek.MONDAY, "17:00", "22:00")));

        assertThat(stats.weeklyNightHours()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("연장 이중계상 금지 — 주 55h(일 11h×5일): 일 기준 15h == 주 기준 15h, 합산 아님")
    void overtimeIsMaxOfDailyAndWeeklyNotSum() {
        List<WorkScheduleDay> schedule = List.of(
                day(DayOfWeek.MONDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.WEDNESDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.THURSDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.FRIDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.SUNDAY, "11:00", "23:00", "14:00", "15:00"));

        var stats = WorkScheduleCalculator.weeklyStats(schedule);

        assertThat(stats.weeklyActualHours()).isEqualTo(55.0);
        assertThat(stats.weeklyContractedHours()).isEqualTo(40.0);
        assertThat(stats.weeklyOvertimeHours()).isEqualTo(15.0); // max(5×3, 55−40) — 30h 아님
        assertThat(stats.weeklyNightHours()).isEqualTo(5.0);     // 일 22~23시 1h × 5
    }

    @Test
    @DisplayName("일 기준 연장이 주 기준보다 크면 일 기준 채택 — 3일×12h: 실근로 36h, 연장 12h")
    void dailyOvertimeDominatesWhenWeeklyUnderForty() {
        List<WorkScheduleDay> schedule = List.of(
                day(DayOfWeek.MONDAY, "09:00", "21:00"),
                day(DayOfWeek.WEDNESDAY, "09:00", "21:00"),
                day(DayOfWeek.FRIDAY, "09:00", "21:00"));

        var stats = WorkScheduleCalculator.weeklyStats(schedule);

        assertThat(stats.weeklyActualHours()).isEqualTo(36.0);
        assertThat(stats.weeklyOvertimeHours()).isEqualTo(12.0); // Σmax(12−8,0), 주 36−40<0 은 무시
        assertThat(stats.weeklyContractedHours()).isEqualTo(36.0); // min(36, 40)
    }

    @Test
    @DisplayName("주 기준 연장이 크면 주 기준 채택 — 6일×11h: 연장 26h(일 기준 18h 아님)")
    void weeklyOvertimeDominatesOverDaily() {
        List<WorkScheduleDay> schedule = List.of(
                day(DayOfWeek.MONDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.TUESDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.WEDNESDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.THURSDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.FRIDAY, "11:00", "23:00", "14:00", "15:00"),
                day(DayOfWeek.SATURDAY, "11:00", "23:00", "14:00", "15:00"));

        var stats = WorkScheduleCalculator.weeklyStats(schedule);

        assertThat(stats.weeklyActualHours()).isEqualTo(66.0);
        assertThat(stats.weeklyOvertimeHours()).isEqualTo(26.0);
        assertThat(stats.weeklyContractedHours()).isEqualTo(40.0);
    }

    @Test
    @DisplayName("월 환산 계수는 365/7/12 — 주 15h 연장 → 월 65.18h")
    void monthlyConversionUsesExactFactor() {
        assertThat(WorkScheduleCalculator.monthlyHours(15.0)).isCloseTo(65.1786, within(0.0001));
        assertThat(WorkScheduleCalculator.monthlyHours(26.0)).isCloseTo(112.9762, within(0.0001));
        assertThat(WorkScheduleCalculator.monthlyHours(5.0)).isCloseTo(21.7262, within(0.0001));
    }

    @Test
    @DisplayName("요일 중복은 거부")
    void rejectsDuplicateDay() {
        assertThatThrownBy(() -> WorkScheduleCalculator.weeklyStats(List.of(
                day(DayOfWeek.MONDAY, "09:00", "18:00"),
                day(DayOfWeek.MONDAY, "10:00", "19:00"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복");
    }

    @Test
    @DisplayName("휴게 시작·종료 반쪽 입력은 거부")
    void rejectsHalfBreakInput() {
        assertThatThrownBy(() -> WorkScheduleCalculator.weeklyStats(List.of(
                new WorkScheduleDay(DayOfWeek.MONDAY, LocalTime.of(9, 0), LocalTime.of(18, 0),
                        LocalTime.of(12, 0), null))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("함께");
    }

    @Test
    @DisplayName("근무 구간 밖 휴게는 거부")
    void rejectsBreakOutsideShift() {
        assertThatThrownBy(() -> WorkScheduleCalculator.weeklyStats(List.of(
                day(DayOfWeek.MONDAY, "17:00", "22:00", "12:00", "13:00"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("근무시간");
    }

    @Test
    @DisplayName("시업=종업(24시간 해석)은 거부")
    void rejectsEqualStartAndEnd() {
        assertThatThrownBy(() -> WorkScheduleCalculator.weeklyStats(List.of(
                day(DayOfWeek.MONDAY, "09:00", "09:00"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("24시간");
    }

    @Test
    @DisplayName("빈 스케줄은 거부")
    void rejectsEmptySchedule() {
        assertThatThrownBy(() -> WorkScheduleCalculator.weeklyStats(List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("요일별 실근로 맵 — 근무 요일만 채워진다(mon_hours~sun_hours 유도 소스)")
    void dailyWorkedHoursOnlyForWorkingDays() {
        var stats = WorkScheduleCalculator.weeklyStats(List.of(
                day(DayOfWeek.MONDAY, "17:00", "22:00"),
                day(DayOfWeek.SATURDAY, "11:00", "23:00", "15:00", "16:00")));

        assertThat(stats.dailyWorkedHours())
                .containsEntry(DayOfWeek.MONDAY, 5.0)
                .containsEntry(DayOfWeek.SATURDAY, 11.0)
                .doesNotContainKey(DayOfWeek.TUESDAY);
        assertThat(stats.workingDays()).isEqualTo(2);
    }
}
