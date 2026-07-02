package com.rich.sodam.core.payroll.weeklyallowance.strategy;

import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyWorkPattern;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 평일 고정 풀타임(주 40시간 이상) 주휴수당 전략.
 *
 * <p>1주 소정근로 40시간 이상이면 주휴는 상한 8시간 × 시급 = 1일분 일급.
 * (예: 주 5일 × 8시간, 시급 10,030원 → 8 × 10,030 = 80,240원)</p>
 */
@Component
public class FullTimeWeekdayWeeklyAllowanceCalculator implements WeeklyAllowanceCalculator {

    @Override
    public boolean supports(WeeklyAllowanceContext context) {
        // 자격 충족 + 주 40시간 이상 + (평일고정 또는 형태 미지정)
        if (!context.meetsMinimumHours() || !context.isPerfectAttendance()) {
            return false;
        }
        boolean fullTimeHours = context.weeklyContractedHours()
                .compareTo(LaborLawConstants.STATUTORY_WEEKLY_HOURS) >= 0;
        return fullTimeHours
                && (context.pattern() == WeeklyWorkPattern.WEEKDAY_FIXED
                || context.pattern() == WeeklyWorkPattern.AUTO);
    }

    @Override
    public WeeklyAllowanceResult calculate(WeeklyAllowanceContext context) {
        BigDecimal paidHours = LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS; // 상한 8h
        BigDecimal amount = toAmount(paidHours, context.hourlyWage());
        return new WeeklyAllowanceResult(amount, paidHours, "FULLTIME_WEEKDAY", null);
    }

    @Override
    public int priority() {
        return 50;
    }
}
