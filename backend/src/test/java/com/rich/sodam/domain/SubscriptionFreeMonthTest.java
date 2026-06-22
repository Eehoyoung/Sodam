package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * 레퍼럴 보상 무료 개월 부여 (S2) — 기간·다음 청구일 연장.
 */
class SubscriptionFreeMonthTest {

    @Test
    @DisplayName("grantFreeMonths(1) → 기간 종료·다음 청구일 +1개월")
    void grantsOneMonth() {
        Subscription s = Subscription.pending(mock(User.class), PlanType.STARTER, BillingCycle.MONTHLY, "ck");
        s.activate(LocalDateTime.of(2026, 6, 1, 0, 0), LocalDateTime.of(2026, 7, 1, 0, 0));

        s.grantFreeMonths(1);

        assertThat(s.getCurrentPeriodEndAt()).isEqualTo(LocalDateTime.of(2026, 8, 1, 0, 0));
        assertThat(s.getNextBillingAt()).isEqualTo(LocalDateTime.of(2026, 8, 1, 0, 0));
    }

    @Test
    @DisplayName("0개월/음수 → 변화 없음")
    void zeroIsNoop() {
        Subscription s = Subscription.pending(mock(User.class), PlanType.STARTER, BillingCycle.MONTHLY, "ck");
        s.activate(LocalDateTime.of(2026, 6, 1, 0, 0), LocalDateTime.of(2026, 7, 1, 0, 0));

        s.grantFreeMonths(0);
        s.grantFreeMonths(-3);

        assertThat(s.getNextBillingAt()).isEqualTo(LocalDateTime.of(2026, 7, 1, 0, 0));
    }
}
