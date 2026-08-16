package com.rich.sodam.service;

import com.rich.sodam.config.PlanPricingProperties;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 플랜 가격 해석기(WP-8) — override 미설정 시 현행값 유지, 설정 시 override 우선,
 * grandfathering(가입 시점 잠금 가격) 우선순위 검증.
 */
class PlanPricingServiceTest {

    private final PlanPricingProperties properties = new PlanPricingProperties();
    private final PlanPricingService service = new PlanPricingService(properties);

    private Subscription subscriptionOf(PlanType plan) {
        User user = new User("pricing@test.co", "가격테스트");
        return Subscription.pending(user, plan, BillingCycle.MONTHLY, "cust_pricing");
    }

    @Test
    @DisplayName("override 전부 미설정 — 모든 유료 티어가 PlanType enum 현행값 그대로")
    void noOverrideKeepsCurrentValues() {
        assertThat(service.currentCatalogPriceKrw(PlanType.STARTER)).isEqualTo(PlanType.STARTER.getMonthlyPriceKrw());
        assertThat(service.currentCatalogPriceKrw(PlanType.PRO)).isEqualTo(PlanType.PRO.getMonthlyPriceKrw());
        assertThat(service.currentCatalogPriceKrw(PlanType.PREMIUM)).isEqualTo(PlanType.PREMIUM.getMonthlyPriceKrw());
    }

    @Test
    @DisplayName("FREE는 override 대상이 아니다 — 항상 0원")
    void freeNeverOverridden() {
        properties.setStarterMonthlyKrw(99_000); // FREE에는 영향 없음을 보이기 위한 설정
        assertThat(service.currentCatalogPriceKrw(PlanType.FREE)).isEqualTo(0);
    }

    @Test
    @DisplayName("override 설정 시 그 값을 우선한다")
    void overrideTakesPrecedence() {
        properties.setProMonthlyKrw(29_900);

        assertThat(service.currentCatalogPriceKrw(PlanType.PRO)).isEqualTo(29_900);
        // 건드리지 않은 티어는 영향 없음
        assertThat(service.currentCatalogPriceKrw(PlanType.STARTER)).isEqualTo(PlanType.STARTER.getMonthlyPriceKrw());
    }

    @Test
    @DisplayName("grandfathering — 가입 시점 잠금 가격이 있으면 이후 override가 바뀌어도 그 구독은 영향받지 않는다")
    void lockedPriceSurvivesLaterOverrideChange() {
        Subscription sub = subscriptionOf(PlanType.PRO);
        sub.lockPrice(service.currentCatalogPriceKrw(PlanType.PRO)); // 가입 시점 스냅샷(19,900)

        assertThat(service.effectivePriceKrw(sub)).isEqualTo(19_900);

        // 가입 이후 카탈로그 가격이 올랐다고 가정
        properties.setProMonthlyKrw(29_900);

        // 신규 가입자는 새 가격이지만, 이미 가입한 sub은 여전히 옛 가격
        assertThat(service.currentCatalogPriceKrw(PlanType.PRO)).isEqualTo(29_900);
        assertThat(service.effectivePriceKrw(sub)).isEqualTo(19_900);
    }

    @Test
    @DisplayName("잠금 가격이 없는 구독(과거 데이터)은 현재 카탈로그 가격으로 자연 폴백한다")
    void fallsBackToCatalogWhenNotLocked() {
        Subscription sub = subscriptionOf(PlanType.STARTER); // lockPrice 호출 안 함(레거시 데이터 시뮬레이션)

        assertThat(sub.getPriceAtSignupKrw()).isNull();
        assertThat(service.effectivePriceKrw(sub)).isEqualTo(PlanType.STARTER.getMonthlyPriceKrw());
    }

    @Test
    @DisplayName("lockPrice는 최초 1회만 적용된다 — 재호출로 가입가를 바꿀 수 없다")
    void lockPriceIsIdempotent() {
        Subscription sub = subscriptionOf(PlanType.PRO);
        sub.lockPrice(19_900);

        sub.lockPrice(29_900); // 재호출 — 무시돼야 함

        assertThat(sub.getPriceAtSignupKrw()).isEqualTo(19_900);
    }

    @Test
    @DisplayName("WP-D: assignVariant — 같은 userId는 항상 같은 그룹으로 결정적으로 배정된다")
    void assignVariantIsDeterministic() {
        String first = service.assignVariant(42L);
        String second = service.assignVariant(42L);

        assertThat(first).isIn("A", "B");
        assertThat(second).isEqualTo(first);
    }

    @Test
    @DisplayName("WP-D: assignVariant — userId가 null이면 null(실험 미대상)")
    void assignVariantNullSafe() {
        assertThat(service.assignVariant(null)).isNull();
    }

    @Test
    @DisplayName("WP-D: assignVariant — 여러 userId에 걸쳐 A/B 양쪽 모두 나온다(한쪽으로 쏠리지 않음)")
    void assignVariantProducesBothGroups() {
        java.util.Set<String> seen = new java.util.HashSet<>();
        for (long userId = 1; userId <= 50; userId++) {
            seen.add(service.assignVariant(userId));
        }

        assertThat(seen).containsExactlyInAnyOrder("A", "B");
    }

}
