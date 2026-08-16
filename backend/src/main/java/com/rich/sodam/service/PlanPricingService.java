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

    /** 홀수/짝수 사용자 ID가 그대로 그룹과 상관되지 않도록 섞는 승수(Knuth 곱셈 해시). */
    private static final long VARIANT_HASH_MULTIPLIER = 2_654_435_761L;

    /**
     * 260816 WP-D — A/B 가격 실험 그룹 배정("A"/"B", 50:50). 같은 userId는 항상 같은 그룹으로
     * 결정적으로 배정된다(재계산해도 결과가 바뀌지 않음 — 실험 도중 그룹이 흔들리면 안 되므로).
     *
     * <p>⚠️ 이 메서드는 <b>그룹만 나눈다</b> — 그룹별로 다른 금액을 청구하는 로직은 없다.
     * {@link #currentCatalogPriceKrw}·{@link #effectivePriceKrw}는 이 배정과 무관하게 항상
     * 같은 카탈로그 가격을 반환한다. 그룹별 차등 가격은 실제 실험 설계 + 가격 인상(H-7 승인)이
     * 선행돼야 한다 — 지금은 표시조차 하지 않는다.
     */
    public String assignVariant(Long userId) {
        if (userId == null) {
            return null;
        }
        long mixed = userId * VARIANT_HASH_MULTIPLIER;
        return (mixed & 1) == 0 ? "A" : "B";
    }
}
