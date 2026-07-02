package com.rich.sodam.core.payroll.weeklyallowance;

import java.math.BigDecimal;

/**
 * 주휴수당 1주 산정 결과.
 *
 * @param amount       주휴수당(원, 반올림된 정수 금액)
 * @param paidHours    주휴 환산 시간(시간). 감사/명세 표기용.
 * @param strategyName 적용된 전략 이름. 어떤 규칙으로 계산됐는지 추적용.
 * @param reason       0원이거나 특이 산정 시 사유(없으면 null).
 */
public record WeeklyAllowanceResult(
        BigDecimal amount,
        BigDecimal paidHours,
        String strategyName,
        String reason
) {

    public static WeeklyAllowanceResult zero(String strategyName, String reason) {
        return new WeeklyAllowanceResult(BigDecimal.ZERO, BigDecimal.ZERO, strategyName, reason);
    }

    /** 정수 금액(원)으로 반환. 기존 코드와의 호환을 위한 헬퍼. */
    public int amountAsInt() {
        return amount.setScale(0, java.math.RoundingMode.HALF_UP).intValue();
    }
}
