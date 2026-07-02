package com.rich.sodam.core.payroll.weeklyallowance;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 주휴수당 계산 전략(strategy).
 *
 * <p>근무 형태별로 1주 소정근로시간 산정 방식이 달라 전략을 분리한다. 새 형태가 필요하면
 * 이 인터페이스를 구현한 Spring Bean 을 추가하기만 하면 {@link WeeklyAllowanceCalculatorResolver}
 * 가 자동으로 등록한다(시스템 core 로직).</p>
 *
 * <p>공통 법정 공식(주휴시간 = min(소정근로/40 × 8, 8))은 {@link #statutoryPaidHours} 기본 메서드로 제공하고,
 * 각 전략은 "어떤 소정근로시간을 넣을지"와 "지급 대상인지"만 결정한다.</p>
 */
public interface WeeklyAllowanceCalculator {

    /** 이 전략이 주어진 컨텍스트를 처리할 수 있는지. */
    boolean supports(WeeklyAllowanceContext context);

    /** 주휴수당 산정. */
    WeeklyAllowanceResult calculate(WeeklyAllowanceContext context);

    /**
     * 우선순위. 여러 전략이 supports=true 일 때 값이 큰 전략이 선택된다.
     * 기본 0. 더 구체적인(좁은) 전략일수록 높은 값을 준다.
     */
    default int priority() {
        return 0;
    }

    /**
     * 법정 주휴 환산 시간 = min(소정근로시간 / 40 × 8, 8).
     * 소정근로 40시간 이상이면 상한 8시간으로 고정된다.
     */
    default BigDecimal statutoryPaidHours(BigDecimal weeklyContractedHours) {
        BigDecimal paidHours = weeklyContractedHours
                .divide(LaborLawConstants.STATUTORY_WEEKLY_HOURS, 10, RoundingMode.HALF_UP)
                .multiply(LaborLawConstants.STATUTORY_DAILY_HOURS);
        return paidHours.min(LaborLawConstants.MAX_WEEKLY_ALLOWANCE_HOURS);
    }

    /** 주휴 환산 시간 × 시급 → 금액(원, 반올림). */
    default BigDecimal toAmount(BigDecimal paidHours, BigDecimal hourlyWage) {
        return paidHours.multiply(hourlyWage).setScale(0, RoundingMode.HALF_UP);
    }
}
