package com.rich.sodam.core.payroll.weeklyallowance.strategy;

import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import org.springframework.stereotype.Component;

/**
 * 주휴수당 미발생 전략.
 *
 * <p>다음 중 하나면 주휴수당 0원:
 * <ul>
 *   <li>1주 소정근로시간 15시간 미만 (근로기준법 §18③ 단서)</li>
 *   <li>소정근로일 개근하지 못함 (근로기준법 §55 — 만근 요건)</li>
 * </ul>
 * 가장 먼저 판정되어야 하므로 우선순위를 최상위로 둔다.</p>
 */
@Component
public class IneligibleWeeklyAllowanceCalculator implements WeeklyAllowanceCalculator {

    @Override
    public boolean supports(WeeklyAllowanceContext context) {
        return !context.meetsMinimumHours() || !context.isPerfectAttendance();
    }

    @Override
    public WeeklyAllowanceResult calculate(WeeklyAllowanceContext context) {
        String reason = !context.meetsMinimumHours()
                ? "1주 소정근로시간 15시간 미만 — 주휴수당 미발생"
                : "소정근로일 미개근 — 주휴수당 미발생";
        return WeeklyAllowanceResult.zero(name(), reason);
    }

    @Override
    public int priority() {
        return 100; // 자격 미달은 가장 먼저 차단
    }

    private String name() {
        return "INELIGIBLE";
    }
}
