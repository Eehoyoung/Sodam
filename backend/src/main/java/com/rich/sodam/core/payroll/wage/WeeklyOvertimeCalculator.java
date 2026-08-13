package com.rich.sodam.core.payroll.wage;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import org.springframework.stereotype.Component;

/**
 * Determines the portion of weekly overtime that has not already been
 * classified as daily overtime. The caller applies the resulting hours to
 * concrete payroll details so an hour can receive only one overtime premium.
 */
@Component
public class WeeklyOvertimeCalculator {

    public double additionalOvertimeHours(double payableHours, double dailyOvertimeHours) {
        double weeklyExcess = Math.max(0, payableHours - LaborLawConstants.STATUTORY_WEEKLY_HOURS.doubleValue());
        return Math.max(0, round2(weeklyExcess - dailyOvertimeHours));
    }

    /**
     * 위 시간에 대해 지급할 금액. <b>가산분(50%)만</b> 낸다 — 기본 100%는 이미 일자별 정상근로
     * 임금(시급제) 또는 월급(월급제)에 포함돼 있어, 100%를 다시 더하면 이중지급이 된다.
     *
     * @param premiumApplicable 5인 이상이면 true. 5인 미만은 §56 가산 대상이 아니라 0원이다.
     */
    public int premiumWage(int hourlyWage, double additionalOvertimeHours, boolean premiumApplicable) {
        if (!premiumApplicable || additionalOvertimeHours <= 0) {
            return 0;
        }
        return (int) Math.round(hourlyWage * additionalOvertimeHours
                * LaborStandards.OVERTIME_PREMIUM.doubleValue());
    }

    private double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
