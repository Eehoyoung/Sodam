package com.rich.sodam.domain.type;

import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 구독 청구 주기. 수익화 확정안 §1: 연납 = 2개월 무료, 반년납 = 1개월 무료.
 *
 * 청구 금액 = 월정액 × (주기개월 − 무료개월). 기간 종료일은 주기개월 후.
 */
@Getter
public enum BillingCycle {

    MONTHLY(1, 0, "월납"),
    HALF_YEARLY(6, 1, "반년납(1개월 무료)"),
    YEARLY(12, 2, "연납(2개월 무료)");

    private final int months;
    private final int freeMonths;
    private final String displayName;

    BillingCycle(int months, int freeMonths, String displayName) {
        this.months = months;
        this.freeMonths = freeMonths;
        this.displayName = displayName;
    }

    /** 실제 청구 개월 수(무료 개월 차감). */
    public int chargedMonths() {
        return months - freeMonths;
    }

    /** 이 주기 1회 청구 금액(원). */
    public int amountFor(PlanType plan) {
        return plan.getMonthlyPriceKrw() * chargedMonths();
    }

    /** 청구 시점 기준 다음 기간 종료일. */
    public LocalDateTime periodEndFrom(LocalDateTime from) {
        return from.plusMonths(months);
    }
}
