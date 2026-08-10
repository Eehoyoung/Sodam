package com.rich.sodam.core.payroll.wage;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 야간근로 시간(22:00~익일 06:00) 계산기. 단일 책임(SRP).
 *
 * <p>⚠️ 구 로직은 {@code LocalTime.plusHours(24)} 에 의존했으나 {@code LocalTime} 은 24시간 모듈로라
 * 그 연산이 무효(원래 시각 반환)였다. 그 결과 자정을 넘기는 교대근무(예: 22:00~06:00, 20:00~02:00)에서
 * 야간시간이 0 으로 계산되어 <b>야간가산수당 전액 미지급(임금체불, 근로기준법 §56③·§43)</b>되었다.</p>
 *
 * <p>본 계산기는 실제 출퇴근 {@link LocalDateTime} 기준으로, 근무가 걸친 각 날짜의 야간구간
 * [D 22:00, D+1 06:00] 과 근무구간의 교집합(분 단위)을 합산해 정확히 계산한다.</p>
 */
@Component
public class NightWorkCalculator {

    /**
     * @param checkIn  실제 출근 일시
     * @param checkOut 실제 퇴근 일시
     * @param nightStart 야간 시작(보통 22:00). null 이면 법정 기본값.
     * @return 야간근로 시간(시간, 소수 2자리)
     */
    public double calculate(LocalDateTime checkIn, LocalDateTime checkOut, LocalTime nightStart) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            return 0;
        }
        // A policy can make the benefit start earlier, but cannot defer the legal 22:00 start.
        LocalTime start = effectiveNightStart(nightStart);
        LocalTime end = LaborStandards.NIGHT_END;

        long nightSeconds = 0;
        // 전날 야간(새벽 구간)까지 포함하기 위해 출근 전날부터 퇴근 당일까지 순회
        LocalDate day = checkIn.toLocalDate().minusDays(1);
        LocalDate lastDay = checkOut.toLocalDate();
        while (!day.isAfter(lastDay)) {
            LocalDateTime nightFrom = LocalDateTime.of(day, start);
            LocalDateTime nightTo = LocalDateTime.of(day.plusDays(1), end);
            // 근무구간 ∩ 야간구간
            LocalDateTime s = checkIn.isAfter(nightFrom) ? checkIn : nightFrom;
            LocalDateTime e = checkOut.isBefore(nightTo) ? checkOut : nightTo;
            if (e.isAfter(s)) {
                nightSeconds += Duration.between(s, e).toSeconds();
            }
            day = day.plusDays(1);
        }
        return round2(nightSeconds / 3600.0);
    }

    /** Returns night hours eligible for pay after deducting the statutory unpaid break. */
    public double calculatePayable(LocalDateTime checkIn, LocalDateTime checkOut, LocalTime nightStart) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            return 0;
        }
        LocalTime effectiveNightStart = effectiveNightStart(nightStart);
        Duration workedDuration = Duration.between(checkIn, checkOut);
        long breakMinutes = BreakTimeCalculator.requiredBreakMinutes(workedDuration);
        if (breakMinutes == 0) {
            return calculate(checkIn, checkOut, effectiveNightStart);
        }
        long breakSeconds = Duration.ofMinutes(breakMinutes).toSeconds();
        LocalDateTime breakStart = checkIn.plusSeconds((workedDuration.toSeconds() - breakSeconds) / 2);
        LocalDateTime breakEnd = breakStart.plusMinutes(breakMinutes);
        double unpaidNightBreak = nightSecondsWithin(checkIn, checkOut, breakStart, breakEnd,
                effectiveNightStart, LaborStandards.NIGHT_END) / 3600.0;
        return Math.max(0, round2(calculate(checkIn, checkOut, effectiveNightStart) - unpaidNightBreak));
    }

    private long nightSecondsWithin(LocalDateTime checkIn, LocalDateTime checkOut,
                                    LocalDateTime intervalStart, LocalDateTime intervalEnd,
                                    LocalTime nightStart, LocalTime nightEnd) {
        long seconds = 0;
        LocalDate day = checkIn.toLocalDate().minusDays(1);
        LocalDate lastDay = checkOut.toLocalDate();
        while (!day.isAfter(lastDay)) {
            LocalDateTime nightFrom = LocalDateTime.of(day, nightStart);
            LocalDateTime nightTo = LocalDateTime.of(day.plusDays(1), nightEnd);
            LocalDateTime start = intervalStart.isAfter(nightFrom) ? intervalStart : nightFrom;
            LocalDateTime end = intervalEnd.isBefore(nightTo) ? intervalEnd : nightTo;
            if (end.isAfter(start)) {
                seconds += Duration.between(start, end).toSeconds();
            }
            day = day.plusDays(1);
        }
        return seconds;
    }

    private LocalTime effectiveNightStart(LocalTime nightStart) {
        if (nightStart == null || !nightStart.equals(LaborStandards.NIGHT_START)) {
            return LaborStandards.NIGHT_START;
        }
        return nightStart;
    }

    private double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
