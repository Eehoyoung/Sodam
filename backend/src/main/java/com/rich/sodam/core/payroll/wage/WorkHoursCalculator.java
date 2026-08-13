package com.rich.sodam.core.payroll.wage;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 일일 근로시간을 정상/연장으로 분해하고 휴게시간(§54)을 공제하는 계산기. 단일 책임(SRP).
 *
 * <p>⚠️ 구 {@code splitWorkingHours} 는 {@code LocalTime} 기반이라 자정을 넘기는 교대근무에서
 * {@code endTime.isBefore(startTime)} 보정에 {@code LocalTime.plusHours(24)}(무효)를 써
 * 총 근로시간이 <b>음수</b>가 되어 기본임금이 미지급되었다. 본 계산기는 실제 출퇴근
 * {@link LocalDateTime} 으로 정확히 산정한다.</p>
 *
 * <p>휴게시간(§54)은 무급이므로 임금산정 근로시간에서 공제한다(4h↑ 30분, 8h↑ 1시간). 5인 미만에도 적용.</p>
 */
@Component
public class WorkHoursCalculator {

    /**
     * @param checkIn          실제 출근 일시
     * @param checkOut         실제 퇴근 일시
     * @param regularHoursLimit 1일 소정근로시간(보통 8h). 초과분이 연장근로.
     */
    public WorkHoursResult calculate(LocalDateTime checkIn, LocalDateTime checkOut, double regularHoursLimit) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            return new WorkHoursResult(0, 0, 0);
        }

        Duration workedDuration = Duration.between(checkIn, checkOut);
        double grossHours = round2(workedDuration.toSeconds() / 3600.0);
        double breakHours = BreakTimeCalculator.requiredBreakMinutes(workedDuration) / 60.0;
        double netHours = Math.max(0, round2(grossHours - breakHours));

        // Keep more-favourable lower policy limits, but never let stored legacy values
        // weaken the statutory daily eight-hour overtime threshold.
        double effectiveRegularHoursLimit = Math.min(regularHoursLimit, LaborStandards.STATUTORY_DAILY_HOURS);
        double regularHours = Math.min(netHours, effectiveRegularHoursLimit);
        double overtimeHours = Math.max(0, round2(netHours - effectiveRegularHoursLimit));

        return new WorkHoursResult(regularHours, overtimeHours, breakHours);
    }

    // §54 휴게시간 판정은 BreakTimeCalculator.requiredBreakMinutes(Duration) 이 담당한다.
    // 반올림된 시간(double)으로 4h/8h 경계를 재면 3:59:59 가 4.0 으로 올라가 휴게가 잘못 붙는다.

    private double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
