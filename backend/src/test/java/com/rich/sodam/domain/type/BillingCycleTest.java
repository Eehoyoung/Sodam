package com.rich.sodam.domain.type;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 청구 주기 할인·기간 계산. 확정안 §1: 연납 2개월 무료, 반년납 1개월 무료.
 */
class BillingCycleTest {

    @Test
    @DisplayName("월납: 1개월치 전액")
    void monthly() {
        assertThat(BillingCycle.MONTHLY.chargedMonths()).isEqualTo(1);
        assertThat(BillingCycle.MONTHLY.amountFor(PlanType.PRO)).isEqualTo(19_900);
    }

    @Test
    @DisplayName("반년납: 6개월 중 1개월 무료 → 5개월치 청구")
    void halfYear() {
        assertThat(BillingCycle.HALF_YEARLY.chargedMonths()).isEqualTo(5);
        assertThat(BillingCycle.HALF_YEARLY.amountFor(PlanType.PRO)).isEqualTo(19_900 * 5);
    }

    @Test
    @DisplayName("연납: 12개월 중 2개월 무료 → 10개월치 청구")
    void yearly() {
        assertThat(BillingCycle.YEARLY.chargedMonths()).isEqualTo(10);
        assertThat(BillingCycle.YEARLY.amountFor(PlanType.STARTER)).isEqualTo(9_900 * 10);
    }

    @Test
    @DisplayName("WP-8: amountFor(월정액) — 직접 지정한 가격으로 계산(gradfathering/override 적용값)")
    void amountForExplicitPrice() {
        assertThat(BillingCycle.MONTHLY.amountFor(14_900)).isEqualTo(14_900);
        assertThat(BillingCycle.HALF_YEARLY.amountFor(14_900)).isEqualTo(14_900 * 5);
        assertThat(BillingCycle.YEARLY.amountFor(14_900)).isEqualTo(14_900 * 10);
        // 카탈로그 가격 오버로드와 결과가 같아야 한다(override 없을 때 동일 경로를 검증)
        assertThat(BillingCycle.MONTHLY.amountFor(PlanType.PRO.getMonthlyPriceKrw()))
                .isEqualTo(BillingCycle.MONTHLY.amountFor(PlanType.PRO));
    }

    @Test
    @DisplayName("기간 종료일은 주기 개월 후")
    void periodEnd() {
        LocalDateTime from = LocalDateTime.of(2026, 6, 1, 0, 0);
        assertThat(BillingCycle.MONTHLY.periodEndFrom(from)).isEqualTo(from.plusMonths(1));
        assertThat(BillingCycle.YEARLY.periodEndFrom(from)).isEqualTo(from.plusMonths(12));
    }
}
