package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 구독 상태 머신 단위 테스트.
 */
class SubscriptionDomainTest {

    private Subscription pendingBusiness() {
        User u = new User("owner@x.com", "사장님");
        return Subscription.pending(u, PlanType.PRO, "cust_1_abc");
    }

    @Test
    void 신규구독_초기상태는PENDING_PAYMENT() {
        Subscription s = pendingBusiness();
        assertEquals(SubscriptionStatus.PENDING_PAYMENT, s.getStatus());
        assertEquals(0, s.getPaymentFailureCount());
        assertNull(s.getBillingKey());
    }

    @Test
    void 빌링키부착후도PENDING_PAYMENT() {
        Subscription s = pendingBusiness();
        s.attachBillingKey("MOCK_BK", "테스트카드 1234");
        assertEquals(SubscriptionStatus.PENDING_PAYMENT, s.getStatus());
        assertEquals("MOCK_BK", s.getBillingKey());
    }

    @Test
    void activate_상태ACTIVE로전환_기간기록() {
        Subscription s = pendingBusiness();
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime end = start.plusMonths(1);
        s.activate(start, end);

        assertEquals(SubscriptionStatus.ACTIVE, s.getStatus());
        assertEquals(start, s.getCurrentPeriodStartAt());
        assertEquals(end, s.getCurrentPeriodEndAt());
        assertEquals(end, s.getNextBillingAt());
        assertEquals(0, s.getPaymentFailureCount());
    }

    @Test
    void 결제실패1회_PAST_DUE() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.markPaymentFailed();

        assertEquals(SubscriptionStatus.PAST_DUE, s.getStatus());
        assertEquals(1, s.getPaymentFailureCount());
    }

    @Test
    void 결제실패3회누적_EXPIRED() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.markPaymentFailed();
        s.markPaymentFailed();
        s.markPaymentFailed();

        assertEquals(SubscriptionStatus.EXPIRED, s.getStatus());
        assertEquals(3, s.getPaymentFailureCount());
        assertNotNull(s.getExpiredAt());
    }

    @Test
    void 재청구성공시카운터초기화() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.markPaymentFailed(); // 1회 실패
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));

        assertEquals(SubscriptionStatus.ACTIVE, s.getStatus());
        assertEquals(0, s.getPaymentFailureCount());
    }

    @Test
    void cancel_상태전환_타임스탬프기록() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.cancel();

        assertEquals(SubscriptionStatus.CANCELLED, s.getStatus());
        assertNotNull(s.getCancelledAt());
    }

    @Test
    void cancel은멱등() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.cancel();
        LocalDateTime firstCancel = s.getCancelledAt();

        // 재호출해도 상태 유지
        s.cancel();
        assertEquals(firstCancel, s.getCancelledAt());
    }

    @Test
    void expire는강제만료() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.expire();
        assertEquals(SubscriptionStatus.EXPIRED, s.getStatus());
    }

    @Test
    void isActive_ACTIVE일때만true() {
        Subscription s = pendingBusiness();
        assertFalse(s.isActive());
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        assertTrue(s.isActive());
        s.cancel();
        assertFalse(s.isActive());
    }

    @Test
    void planType_유료여부() {
        assertFalse(PlanType.FREE.isPaid());
        assertTrue(PlanType.STARTER.isPaid());
        assertTrue(PlanType.PRO.isPaid());
        assertTrue(PlanType.PREMIUM.isPaid());
    }

    @Test
    void scheduleRetry_다음청구일을_미룬다() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.markPaymentFailed(); // PAST_DUE
        s.scheduleRetry(3);

        assertEquals(SubscriptionStatus.PAST_DUE, s.getStatus());
        // 재시도 시각이 미래(약 3일 뒤)로 설정됨
        assertTrue(s.getNextBillingAt().isAfter(LocalDateTime.now().plusDays(2)));
    }

    @Test
    void pause_ACTIVE에서만_PAUSED로() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.pause();
        assertEquals(SubscriptionStatus.PAUSED, s.getStatus());
        assertNotNull(s.getPausedAt());
    }

    @Test
    void pause_비활성상태면_예외() {
        Subscription s = pendingBusiness(); // PENDING_PAYMENT
        assertThrows(IllegalStateException.class, s::pause);
    }

    @Test
    void resume_PAUSED에서_ACTIVE복귀() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.pause();
        s.resume();
        assertEquals(SubscriptionStatus.ACTIVE, s.getStatus());
        assertNull(s.getPausedAt());
    }

    @Test
    void 기본청구주기는_월납() {
        Subscription s = pendingBusiness();
        assertEquals(com.rich.sodam.domain.type.BillingCycle.MONTHLY, s.getBillingCycle());
    }
}
