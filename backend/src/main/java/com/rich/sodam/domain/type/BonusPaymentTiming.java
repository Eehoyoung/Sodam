package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 즉시 보너스 지급 방식.
 *
 * <p>사장이 그 자리에서 이미 현금을 건넨 경우(IMMEDIATE_CASH)와, 다음 정산 때
 * 급여에 합산해 지급하는 경우(INCLUDED_IN_PAYROLL)를 구분해야 급여 총액에
 * 중복 반영되지 않는다. 즉시 지급분은 기록만 남기고(세무·4대보험 참고용) 급여
 * 계산에는 합산하지 않는다.
 */
@Getter
public enum BonusPaymentTiming {

    IMMEDIATE_CASH("즉시 현금 지급(이미 지급함)"),
    INCLUDED_IN_PAYROLL("다음 급여에 합산 지급");

    private final String displayName;

    BonusPaymentTiming(String displayName) {
        this.displayName = displayName;
    }
}
