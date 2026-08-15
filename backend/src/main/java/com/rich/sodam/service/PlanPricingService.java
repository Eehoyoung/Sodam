package com.rich.sodam.service;

import com.rich.sodam.config.PlanPricingProperties;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.PlanType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * 플랜 가격 해석기(WP-8) — {@code PlanType} enum의 현행 가격을
 * {@link PlanPricingProperties} override로 덮어쓸 자리를 제공하고, 이미 가입한 구독은
 * 가입 시점 가격(grandfathering)을 우선한다.
 *
 * <p>override가 전부 미설정이면 이 서비스는 {@code PlanType.getMonthlyPriceKrw()}를 그대로
 * 반환한다 — 이번 작업으로 실제 청구 금액이 바뀌지 않는다(HC-13).
 */
@Service
@RequiredArgsConstructor
public class PlanPricingService {

    private final PlanPricingProperties pricingProperties;

    /** 지금 이 순간 신규 가입자에게 적용될 카탈로그 가격(override 우선, 없으면 enum 기본값). */
    public int currentCatalogPriceKrw(PlanType plan) {
        Integer override = switch (plan) {
            case FREE -> null; // FREE는 override 대상 아님 — 항상 0원
            case STARTER -> pricingProperties.getStarterMonthlyKrw();
            case PRO -> pricingProperties.getProMonthlyKrw();
            case PREMIUM -> pricingProperties.getPremiumMonthlyKrw();
        };
        return override != null ? override : plan.getMonthlyPriceKrw();
    }

    /**
     * 이 구독에 실제로 청구할 월정액. 가입 시점에 잠긴 가격({@code priceAtSignupKrw})이 있으면
     * 그 값을 그대로 쓴다(grandfathering — 이후 가격이 올라도 기존 가입자는 가입가 유지).
     * 잠긴 값이 없는 구독(과거 데이터·마이그레이션 이전 가입자)은 현재 카탈로그 가격으로
     * 자연 폴백한다 — 이 경우도 override 미설정 상태에서는 기존 동작과 동일하다.
     */
    public int effectivePriceKrw(Subscription subscription) {
        Integer locked = subscription.getPriceAtSignupKrw();
        return locked != null ? locked : currentCatalogPriceKrw(subscription.getPlan());
    }
}
