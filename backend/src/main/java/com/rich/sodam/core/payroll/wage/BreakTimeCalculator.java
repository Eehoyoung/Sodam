package com.rich.sodam.core.payroll.wage;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 근무시간에 따른 법정 최소 휴게시간 자동 산출/자동 배치 계산기(근로기준법 §54). 단일 책임(SRP), 순수 함수.
 *
 * <p>§54① "근로시간이 4시간인 경우에는 30분 이상, 8시간인 경우에는 1시간 이상의 휴게시간을
 * 근로시간 도중에 부여하여야 한다" — 시업 직후·종업 직전에 배치하면 "도중" 요건을 충족하지
 * 못하므로, 근무 구간의 정중앙에 배치해 항상 앞뒤로 여유를 남긴다. 법은 휴게를 분할 부여하라고
 * 요구하지 않으므로 단일 구간으로 산출한다.</p>
 *
 * <p>야간(자정 넘김) 시프트도 {@link WorkScheduleCalculator}와 동일한 분(minute) 타임라인
 * 규칙(퇴근 ≤ 출근이면 익일 종료)으로 해석해 두 계산기의 결과가 항상 서로 정합한다.</p>
 */
public final class BreakTimeCalculator {

    private static final int MINUTES_PER_DAY = 24 * 60;
    private static final int FOUR_HOURS_MINUTES = 4 * 60;
    private static final int EIGHT_HOURS_MINUTES = 8 * 60;

    /** §54① 8시간 이상 근무 시 법정 최소 휴게(분). */
    public static final int MIN_BREAK_MINUTES_OVER_8H = 60;
    /** §54① 4시간 이상 근무 시 법정 최소 휴게(분). */
    public static final int MIN_BREAK_MINUTES_OVER_4H = 30;

    private BreakTimeCalculator() {
    }

    /**
     * 근무시간(분) 기준 §54 법정 최소 휴게시간(분).
     * 4시간 미만은 법정 의무가 없다(0 반환 — 매장 자체 정책으로 부여는 가능).
     */
    public static int requiredBreakMinutes(int workedMinutes) {
        if (workedMinutes >= EIGHT_HOURS_MINUTES) {
            return MIN_BREAK_MINUTES_OVER_8H;
        }
        if (workedMinutes >= FOUR_HOURS_MINUTES) {
            return MIN_BREAK_MINUTES_OVER_4H;
        }
        return 0;
    }

    /** 자동 산출된 휴게 시작·종료 시각. */
    public record BreakWindow(LocalTime start, LocalTime end) {
    }

    /**
     * 출퇴근 시각으로 법정 최소 휴게시간을 자동 산출하고, 근무 구간 중앙에 배치한 휴게
     * 시작·종료 시각을 반환한다. 법정 휴게 의무가 없는 4시간 미만 근무는 빈 값.
     *
     * @param start 시업 시각
     * @param end   종업 시각(시업 이하이면 익일 종료로 해석 — 야간 시프트)
     */
    public static Optional<BreakWindow> autoBreakWindow(LocalTime start, LocalTime end) {
        if (start == null || end == null) {
            return Optional.empty();
        }
        int s = start.toSecondOfDay() / 60;
        int e = end.toSecondOfDay() / 60;
        if (e <= s) {
            e += MINUTES_PER_DAY; // 자정 넘김 — 익일 종료(WorkScheduleCalculator 규칙과 동일)
        }
        int worked = e - s;
        int breakMinutes = requiredBreakMinutes(worked);
        if (breakMinutes == 0) {
            return Optional.empty();
        }

        // 근무 구간 정중앙 배치 — 시업 직후/종업 직전을 피해 "근로시간 도중" 요건을 항상 만족.
        int breakStart = s + (worked - breakMinutes) / 2;
        int breakEnd = breakStart + breakMinutes;
        return Optional.of(new BreakWindow(
                LocalTime.ofSecondOfDay((long) (breakStart % MINUTES_PER_DAY) * 60),
                LocalTime.ofSecondOfDay((long) (breakEnd % MINUTES_PER_DAY) * 60)));
    }

    /**
     * 스케줄 목록에서 휴게 시각이 비어 있는(시작·종료 모두 null) 요일만 자동 산출값으로 채운다.
     * 이미 휴게를 입력한 요일은 그대로 둔다 — 사장의 수동 입력이 자동 산출보다 우선한다.
     */
    public static List<WorkScheduleDay> autoFillMissingBreaks(List<WorkScheduleDay> schedule) {
        if (schedule == null) {
            return null;
        }
        List<WorkScheduleDay> result = new ArrayList<>(schedule.size());
        for (WorkScheduleDay day : schedule) {
            if (day == null || day.startTime() == null || day.endTime() == null
                    || day.breakStartTime() != null || day.breakEndTime() != null) {
                result.add(day);
                continue;
            }
            Optional<BreakWindow> window = autoBreakWindow(day.startTime(), day.endTime());
            result.add(window
                    .map(w -> new WorkScheduleDay(day.day(), day.startTime(), day.endTime(), w.start(), w.end()))
                    .orElse(day));
        }
        return result;
    }
}
