package com.rich.sodam.core.payroll.weeklyallowance.strategy;

import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceCalculator;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceContext;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyAllowanceResult;
import com.rich.sodam.core.payroll.weeklyallowance.WeeklyWorkPattern;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * 교대/스케줄 근무 주휴수당 전략.
 *
 * <p>주마다 근로시간이 불규칙한 교대 근무는 1주 소정근로시간을 단정하기 어렵다.
 * 본 전략은 컨텍스트에 이미 환산된 {@code weeklyContractedHours}(예: 4주 평균을 호출 측에서 산정)를
 * 그대로 받아 공통 법정 공식(min(시간/40×8, 8))을 적용한다.</p>
 *
 * <p>형태가 명시적으로 {@link WeeklyWorkPattern#SHIFT_SCHEDULE} 일 때만 동작하며,
 * 풀타임/단시간 전략보다 우선한다(같은 시간대라도 교대로 분류되면 이 전략이 선택).</p>
 *
 * <p>⚠️ 4주 평균 소정근로시간 산정·월 경계 처리는 외부 노무사 확인 권장(노무 검증 보고서 §1).</p>
 */
@Component
public class ShiftScheduleWeeklyAllowanceCalculator implements WeeklyAllowanceCalculator {

    @Override
    public boolean supports(WeeklyAllowanceContext context) {
        return context.pattern() == WeeklyWorkPattern.SHIFT_SCHEDULE
                && context.meetsMinimumHours()
                && context.isPerfectAttendance();
    }

    @Override
    public WeeklyAllowanceResult calculate(WeeklyAllowanceContext context) {
        BigDecimal paidHours = statutoryPaidHours(context.weeklyContractedHours());
        BigDecimal amount = toAmount(paidHours, context.hourlyWage());
        return new WeeklyAllowanceResult(amount, paidHours, "SHIFT_SCHEDULE",
                "교대 근무 — 환산 소정근로시간 기준 산정");
    }

    @Override
    public int priority() {
        return 60; // 형태가 교대로 지정되면 풀타임/단시간보다 우선
    }
}
