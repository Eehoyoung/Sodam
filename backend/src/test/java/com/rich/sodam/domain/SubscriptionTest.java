package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-8: 가격 그랜드파더링·A/B 가격 그룹 배정 배선 — 엔티티 단 동작.
 */
class SubscriptionTest {

    private Subscription subscription() {
        User user = new User("sub-entity@test.co", "구독테스트");
        return Subscription.pending(user, PlanType.PRO, BillingCycle.MONTHLY, "cust_entity");
    }

    @Test
    @DisplayName("lockPrice — 최초 호출 시 값이 설정된다")
    void lockPriceSetsValue() {
        Subscription sub = subscription();

        sub.lockPrice(19_900);

        assertThat(sub.getPriceAtSignupKrw()).isEqualTo(19_900);
    }

    @Test
    @DisplayName("lockPrice — 이미 잠긴 뒤 재호출은 무시된다(가입가 임의 변경 방지)")
    void lockPriceIgnoresSecondCall() {
        Subscription sub = subscription();
        sub.lockPrice(19_900);

        sub.lockPrice(1); // 악의적/실수 재호출 가정

        assertThat(sub.getPriceAtSignupKrw()).isEqualTo(19_900);
    }

    @Test
    @DisplayName("assignPriceVariant — A/B 가격 실험 그룹을 배정할 수 있다(기본은 null)")
    void assignsPriceVariant() {
        Subscription sub = subscription();
        assertThat(sub.getPriceVariant()).isNull();

        sub.assignPriceVariant("B");

        assertThat(sub.getPriceVariant()).isEqualTo("B");
    }
}
