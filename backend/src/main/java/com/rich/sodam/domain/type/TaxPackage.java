package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 세무 송객 패키지(단건결제). 확정안 §4-1, §5: 정액 패키지 + 대리수취 회계.
 *
 * <p><b>대리수취 구조</b>: 고객이 내는 금액({@link #customerAmount})은 소담이 <b>예수금</b>으로 받아
 * 세무사에게 전달({@link #partnerPayable})하고, 소담 <b>매출</b>은 송객수수료({@link #referralFee})만 인식한다.
 * → 부가세 베이스 축소 + 세무사법 안전선(소담은 SW+송객만, 대행 안 함).</p>
 */
@Getter
public enum TaxPackage {

    INCOME_TAX_FILING("종합소득세 신고 대행", 99_000, 30_000),
    INCOME_TAX_PREMIUM("종합소득세 프리미엄(고용공제 포함)", 149_000, 49_000),
    BOOKKEEPING_MONTHLY("월 기장 대행", 99_000, 30_000);

    private final String displayName;
    /** 고객 수취 금액(원) — 예수금. */
    private final int customerAmount;
    /** 소담 송객수수료(원) — 유일한 매출 인식분. */
    private final int referralFee;

    TaxPackage(String displayName, int customerAmount, int referralFee) {
        this.displayName = displayName;
        this.customerAmount = customerAmount;
        this.referralFee = referralFee;
    }

    /** 세무사에게 전달할 금액(예수금) = 고객 수취 − 송객수수료. */
    public int partnerPayable() {
        return customerAmount - referralFee;
    }
}
