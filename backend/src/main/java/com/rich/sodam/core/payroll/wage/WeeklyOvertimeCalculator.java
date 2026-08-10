package com.rich.sodam.core.payroll.wage;

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

    private double round2(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
