package com.rich.sodam.core.payroll.wage;

import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 요일별 근무 스케줄 → 주 단위 근로시간 집계기(월급제 자동 산출의 수치 코어). 단일 책임(SRP).
 *
 * <p><b>산식(근로기준법 §50·§53·§56)</b> — 분(minute) 정수 연산으로 부동소수 오차를 차단한다:</p>
 * <ul>
 *   <li>일 실근로 = (퇴근 − 출근) − 휴게. 퇴근 ≤ 출근이면 익일 종료(야간 시프트 규칙과 동일)</li>
 *   <li>주 실근로 = Σ(근무요일 일 실근로)</li>
 *   <li>주 소정 = min(주 실근로, 40h) — §50 법정 상한</li>
 *   <li>주 연장 = <b>max(Σ 일별 8h 초과분, 주 실근로 − 40h)</b> — 일 기준(§53·§56①1)과
 *       주 기준(§50①) 중 큰 쪽 하나만 인정(이중계상 금지)</li>
 *   <li>주 야간 = Σ 일별 근무구간 ∩ 22:00~06:00(§56③). 휴게가 야간대와 겹치면 그만큼 차감</li>
 * </ul>
 *
 * <p><b>월 환산</b>: 주 시간 × 월평균 주수 365÷7÷12(≈4.345238) —
 * {@link MonthlySalaryCalculator} 의 주 소정근로시간 경로와 동일 정밀 계수를 사용해
 * 계약서·정산 산식을 비트 단위로 일치시킨다.</p>
 *
 * <p>가산율(5인 이상 1.5/0.5, 5인 미만 1.0/0)은 여기서 곱하지 않는다 — 금액 산정은
 * {@code LaborContractService.normalizeSalaryTerms} 단일 소스(기존 월급제 직접 입력과 동일 경로).</p>
 */
public final class WorkScheduleCalculator {

    /** 월평균 주수 정밀값(365÷7÷12) — MonthlySalaryCalculator.EXACT_AVG_WEEKS_PER_MONTH 와 동일 산식. */
    public static final double EXACT_AVG_WEEKS_PER_MONTH = 365.0 / 7.0 / 12.0;

    private static final int MINUTES_PER_DAY = 24 * 60;
    private static final int STATUTORY_DAILY_MINUTES = 8 * 60;    // §50② 일 8h
    private static final int STATUTORY_WEEKLY_MINUTES = 40 * 60;  // §50① 주 40h
    /**
     * 야간근로(§56③) 22:00~06:00 구간을 이틀 타임라인(0~2880분) 위의 창(window)으로 표현.
     * [0,360)=당일 00~06시, [1320,1800)=당일 22시~익일 06시, [2760,2880)=익일 22~24시
     * (근무는 최대 24h 미만이므로 그 이후 창은 불필요).
     */
    private static final int[][] NIGHT_WINDOWS = {{0, 360}, {1320, 1800}, {2760, 2880}};

    private WorkScheduleCalculator() {
    }

    /**
     * 주 단위 집계 결과.
     *
     * @param workingDays           주 근무일 수
     * @param weeklyActualHours     주 실근로(휴게 제외)
     * @param weeklyContractedHours 주 소정 = min(실근로, 40h)
     * @param weeklyOvertimeHours   주 연장 = max(Σ일별 8h 초과, 실근로 − 40h)
     * @param weeklyNightHours      주 야간(22~06시 교집합, 휴게 차감)
     * @param dailyWorkedHours      요일별 실근로(근무 없는 요일은 키 없음) — mon_hours~sun_hours 유도용
     */
    public record WeeklyStats(
            int workingDays,
            double weeklyActualHours,
            double weeklyContractedHours,
            double weeklyOvertimeHours,
            double weeklyNightHours,
            Map<DayOfWeek, Double> dailyWorkedHours
    ) {
    }

    /**
     * 스케줄을 구조 검증하고 주 단위로 집계한다.
     *
     * @throws IllegalArgumentException 요일 누락/중복, 시각 누락, 시업=종업, 휴게 반쪽 입력,
     *                                  휴게가 근무 구간 밖, 휴게 ≥ 근무 등 구조 오류
     */
    public static WeeklyStats weeklyStats(List<WorkScheduleDay> schedule) {
        validate(schedule);

        int totalMinutes = 0;
        int dailyOvertimeMinutes = 0;
        int nightMinutes = 0;
        Map<DayOfWeek, Double> daily = new EnumMap<>(DayOfWeek.class);

        for (WorkScheduleDay day : schedule) {
            DayMinutes m = dayMinutes(day);
            totalMinutes += m.worked();
            dailyOvertimeMinutes += Math.max(0, m.worked() - STATUTORY_DAILY_MINUTES);
            nightMinutes += m.night();
            daily.put(day.day(), m.worked() / 60.0);
        }

        int contractedMinutes = Math.min(totalMinutes, STATUTORY_WEEKLY_MINUTES);
        // 일 기준·주 기준 중 큰 쪽 하나만 — 이중계상 금지 (dailyOvertimeMinutes ≥ 0 이므로 음수 걱정 없음)
        int overtimeMinutes = Math.max(dailyOvertimeMinutes, totalMinutes - STATUTORY_WEEKLY_MINUTES);

        return new WeeklyStats(
                schedule.size(),
                totalMinutes / 60.0,
                contractedMinutes / 60.0,
                overtimeMinutes / 60.0,
                nightMinutes / 60.0,
                daily
        );
    }

    /** 주 시간 → 월 시간 환산(× 365/7/12). */
    public static double monthlyHours(double weeklyHours) {
        return weeklyHours * EXACT_AVG_WEEKS_PER_MONTH;
    }

    /** 하루 휴게시간(분). 휴게 미설정이면 0. §17 대표 휴게 표기용. */
    public static int breakMinutesOf(WorkScheduleDay day) {
        if (day.breakStartTime() == null || day.breakEndTime() == null) {
            return 0;
        }
        int start = day.startTime().toSecondOfDay() / 60;
        int[] breakRange = mapBreakOntoTimeline(day, start);
        return breakRange[1] - breakRange[0];
    }

    /** 요일 순 정렬(월→일) 후 첫 근무일 — §17 대표 시업·종업 표기용. */
    public static WorkScheduleDay firstByDayOrder(List<WorkScheduleDay> schedule) {
        return schedule.stream()
                .min(Comparator.comparing(WorkScheduleDay::day))
                .orElseThrow(() -> new IllegalArgumentException("근무 스케줄이 비어 있습니다."));
    }

    // ── 내부 구현 ─────────────────────────────────────────────────────────

    private record DayMinutes(int worked, int night) {
    }

    /** 하루 근무를 이틀 타임라인(0~2880분)에 사상해 실근로·야간 분을 계산한다. */
    private static DayMinutes dayMinutes(WorkScheduleDay day) {
        int start = day.startTime().toSecondOfDay() / 60;
        int end = day.endTime().toSecondOfDay() / 60;
        if (end <= start) {
            end += MINUTES_PER_DAY; // 자정 넘김 — 익일 종료
        }
        int worked = end - start;
        int night = overlapWithNight(start, end);

        if (day.breakStartTime() != null) {
            int[] breakRange = mapBreakOntoTimeline(day, start);
            if (breakRange[0] < start || breakRange[1] > end) {
                throw new IllegalArgumentException(String.format(
                        "%s 휴게시간(%s~%s)이 근무시간(%s~%s) 밖에 있습니다.",
                        koreanDay(day.day()), day.breakStartTime(), day.breakEndTime(),
                        day.startTime(), day.endTime()));
            }
            worked -= breakRange[1] - breakRange[0];
            night -= overlapWithNight(breakRange[0], breakRange[1]);
        }
        if (worked <= 0) {
            throw new IllegalArgumentException(String.format(
                    "%s 실근로시간이 0 이하입니다 — 출퇴근·휴게 시각을 확인해 주세요.", koreanDay(day.day())));
        }
        return new DayMinutes(worked, night);
    }

    /**
     * 휴게 시각을 근무 타임라인 위로 사상한다. 휴게 시작이 출근보다 이르면 익일(+1440),
     * 휴게 종료 ≤ 휴게 시작이면 자정 넘김(+1440)으로 해석 — 근무 구간 해석 규칙과 동일.
     */
    private static int[] mapBreakOntoTimeline(WorkScheduleDay day, int shiftStart) {
        int bs = day.breakStartTime().toSecondOfDay() / 60;
        if (bs < shiftStart) {
            bs += MINUTES_PER_DAY;
        }
        int be = day.breakEndTime().toSecondOfDay() / 60;
        while (be <= bs) {
            be += MINUTES_PER_DAY;
        }
        return new int[]{bs, be};
    }

    /** 구간 [from, to) 과 야간 창(22~06시)들의 교집합 분 합계. */
    private static int overlapWithNight(int from, int to) {
        int sum = 0;
        for (int[] window : NIGHT_WINDOWS) {
            sum += Math.max(0, Math.min(to, window[1]) - Math.max(from, window[0]));
        }
        return sum;
    }

    private static void validate(List<WorkScheduleDay> schedule) {
        if (schedule == null || schedule.isEmpty()) {
            throw new IllegalArgumentException("근무 스케줄에 최소 1개 요일이 필요합니다.");
        }
        Set<DayOfWeek> seen = EnumSet.noneOf(DayOfWeek.class);
        for (WorkScheduleDay day : schedule) {
            if (day == null || day.day() == null) {
                throw new IllegalArgumentException("근무 스케줄의 요일은 필수입니다.");
            }
            if (!seen.add(day.day())) {
                throw new IllegalArgumentException(String.format("%s 스케줄이 중복 입력되었습니다.", koreanDay(day.day())));
            }
            if (day.startTime() == null || day.endTime() == null) {
                throw new IllegalArgumentException(String.format("%s 출근·퇴근 시각은 필수입니다.", koreanDay(day.day())));
            }
            if (day.startTime().equals(day.endTime())) {
                throw new IllegalArgumentException(String.format(
                        "%s 출근·퇴근 시각이 같습니다 — 24시간 근무 스케줄은 지원하지 않습니다.", koreanDay(day.day())));
            }
            if ((day.breakStartTime() == null) != (day.breakEndTime() == null)) {
                throw new IllegalArgumentException(String.format(
                        "%s 휴게 시작·종료 시각은 함께 입력해야 합니다.", koreanDay(day.day())));
            }
        }
    }

    private static String koreanDay(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "월요일";
            case TUESDAY -> "화요일";
            case WEDNESDAY -> "수요일";
            case THURSDAY -> "목요일";
            case FRIDAY -> "금요일";
            case SATURDAY -> "토요일";
            case SUNDAY -> "일요일";
        };
    }
}
