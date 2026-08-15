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

    /** 이 주기 1회 청구 금액(원) — 플랜 카탈로그 기본가 기준. */
    public int amountFor(PlanType plan) {
        return plan.getMonthlyPriceKrw() * chargedMonths();
    }

    /**
     * 이 주기 1회 청구 금액(원) — 월정액을 직접 지정(WP-8). 가입 시점에 잠근 가격
     * (grandfathering)이나 A/B override가 적용된 실제 청구 금액을 계산할 때 쓴다.
     * {@link com.rich.sodam.service.PlanPricingService#effectivePriceKrw}가 이 월정액을 구한다.
     */
    public int amountFor(int monthlyPriceKrw) {
        return monthlyPriceKrw * chargedMonths();
    }

    /** 청구 시점 기준 다음 기간 종료일. */
    public LocalDateTime periodEndFrom(LocalDateTime from) {
        return from.plusMonths(months);
    }
}
