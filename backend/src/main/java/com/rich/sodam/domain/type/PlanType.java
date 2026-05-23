package com.rich.sodam.domain.type;

import lombok.Getter;

/**
 * 구독 플랜 종류. PRD §5.1 기준.
 */
@Getter
public enum PlanType {

    FREE("기본", 0, "기본 근태/급여 + 광고 노출"),
    BUSINESS("비즈니스", 15_000, "근태+급여+명세서+대시보드+CS"),
    PREMIUM("프리미엄", 50_000, "비즈니스 전부 + 세무사 1:1"),
    COMMISSION("환급형", 0, "종소세 환급 수수료 10~20% (월정액 없음)");

    private final String displayName;
    private final int monthlyPriceKrw;
    private final String description;

    PlanType(String displayName, int monthlyPriceKrw, String description) {
        this.displayName = displayName;
        this.monthlyPriceKrw = monthlyPriceKrw;
        this.description = description;
    }

    public boolean isPaid() {
        return monthlyPriceKrw > 0;
    }
}
