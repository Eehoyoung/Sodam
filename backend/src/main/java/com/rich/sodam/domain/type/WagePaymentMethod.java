package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 임금 지급방법 (근로기준법 §17① 1호 — 임금의 지급방법은 서면 명시 필수기재사항).
 *
 * <p>§43(임금 지급 원칙: 통화·직접·전액·정기) 상 계좌이체가 일반적이나 현금 지급도 합의 가능하므로
 * 두 방법을 구분해 보관한다.
 */
@Getter
public enum WagePaymentMethod {

    BANK_TRANSFER("계좌이체"),
    CASH("현금");

    private final String displayName;

    WagePaymentMethod(String displayName) {
        this.displayName = displayName;
    }
}
