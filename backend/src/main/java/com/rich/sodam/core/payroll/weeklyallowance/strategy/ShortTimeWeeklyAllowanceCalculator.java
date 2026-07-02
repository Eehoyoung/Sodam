package com.rich.sodam.core.payroll.weeklyallowance.strategy;

import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 단시간 근로자(주 15시간 이상 40시간 미만) 주휴수당 전략.
 *
 * <p>근로기준법 §18③: 단시간 근로자의 주휴는 통상근로자에 비례.
 * 주휴시간 = (1주 소정근로시간 / 40) × 8.
 * (예: 주 20시간 → 20/40 × 8 = 4시간 × 시급)</p>
 */
@Component
public class ShortTimeWeeklyAllowanceCalculator implements WeeklyAllowanceCalculator {

    @Override
    public boolean supports(WeeklyAllowanceContext context) {
        if (!context.meetsMinimumHours() || !context.isPerfectAttendance()) {
            return false;
        }
        // 15h 이상 40h 미만 (40h 이상은 풀타임 전략이 처리)
        return context.weeklyContractedHours()
                .compareTo(LaborLawConstants.STATUTORY_WEEKLY_HOURS) < 0;
    }

    @Override
    public WeeklyAllowanceResult calculate(WeeklyAllowanceContext context) {
        BigDecimal paidHours = statutoryPaidHours(context.weeklyContractedHours());
        BigDecimal amount = toAmount(paidHours, context.hourlyWage());
        return new WeeklyAllowanceResult(amount, paidHours, "SHORT_TIME", null);
    }

    @Override
    public int priority() {
        return 40;
    }
}
