package com.rich.sodam.core.payroll.leave;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Set;

/**
 * 휴가 신청의 연차 소비일수(환산 일수) 계산기. 단일 책임(SRP), 순수 함수, DB 접근 금지.
 *
 * <p>종일(FULL_DAY)만 근로기준법이 직접 규율한다. 반차(HALF_DAY)는 노사 합의 실무 관행이고,
 * 시간 단위(HOURS)는 <b>매장 자체 정책</b>이다 — 법정 시간 단위 연차(개정 근로기준법)는
 * 2027-06-10 시행 예정으로 2026-07 현재 시행령이 확정되지 않았다. 여기서는 신청 시간을
 * 계약상 소정근로시간 기준으로 일수 환산해 동일한 연차 잔여 풀에서 차감하는 매장 정책으로
 * 구현한다.</p>
 */
public final class TimeOffConsumptionCalculator {

    private TimeOffConsumptionCalculator() {
    }

    /** 반차 소비일수(매장 자체 정책 — 노사 합의 실무). */
    public static final double HALF_DAY_CONSUMED_DAYS = 0.5;

    /** 1일 소정근로시간 기본값(계약상 정보가 없을 때 폴백). */
    public static final double DEFAULT_DAILY_HOURS = 8.0;

    /**
     * 종일(FULL_DAY) 신청 소비일수 — 소정근로일(약정 근무 요일) 기준.
     *
     * <p>연차는 소정근로일에만 소진되므로, 근로계약서 스케줄에 등록된 근무 요일을 알고 있으면
     * 그 요일만 세어 차감한다(주말·비근무 요일이 끼어 있어도 과다 차감되지 않음).
     * 계약 스케줄 정보가 없으면(시급제 등) 판정 불가로 보고 시작~종료 양끝 포함 역일수로
     * 폴백한다(기존 동작 유지 — 회귀 방지).</p>
     *
     * @param scheduledWorkDays 근로계약서 스케줄상 근무 요일 집합. null/빈 집합이면 역일수 폴백.
     */
    public static double fullDayConsumedDays(LocalDate startDate, LocalDate endDate, Set<DayOfWeek> scheduledWorkDays) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return 0.0;
        }
        if (scheduledWorkDays == null || scheduledWorkDays.isEmpty()) {
            long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
            return (double) days;
        }
        double count = 0.0;
        for (LocalDate d = startDate; !d.isAfter(endDate); d = d.plusDays(1)) {
            if (scheduledWorkDays.contains(d.getDayOfWeek())) {
                count += 1.0;
            }
        }
        return count;
    }

    /** 반차 소비일수. */
    public static double halfDayConsumedDays() {
        return HALF_DAY_CONSUMED_DAYS;
    }

    /**
     * 시간 단위 신청 소비일수 환산 = 신청 시간 ÷ 계약상 1일 소정근로시간.
     *
     * @param startTime           신청 시작 시각
     * @param endTime             신청 종료 시각(시작보다 늦어야 함)
     * @param dailyContractedHours 계약상 1일 소정근로시간(null/0 이하면 {@link #DEFAULT_DAILY_HOURS} 적용)
     */
    public static double hoursConsumedDays(LocalTime startTime, LocalTime endTime, Double dailyContractedHours) {
        if (startTime == null || endTime == null || !endTime.isAfter(startTime)) {
            return 0.0;
        }
        double requestedHours = Duration.between(startTime, endTime).toMinutes() / 60.0;
        double daily = (dailyContractedHours == null || dailyContractedHours <= 0)
                ? DEFAULT_DAILY_HOURS : dailyContractedHours;
        return requestedHours / daily;
    }
}
