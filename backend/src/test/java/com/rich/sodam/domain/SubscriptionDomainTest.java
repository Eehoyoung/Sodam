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

    /**
     * 해지는 "기간 말 해지 예약"이다(2026-08-18 확정, C-4).
     * 즉시 CANCELLED 로 떨어뜨리면 PlanAccessService 가 곧바로 무료로 취급해,
     * 이미 결제한 기간의 유료 기능을 그 자리에서 빼앗는다 — 약관 제20조 3항 위반.
     */
    @Test
    void cancel_기간말해지예약_이용권은유지된다() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.cancel();

        assertEquals(SubscriptionStatus.ACTIVE, s.getStatus());
        assertTrue(s.isActive());
        assertTrue(s.isCancelScheduled());
        assertNotNull(s.getCancelledAt());
        // 자동갱신 중단: 다음 청구 대상에서 빠진다
        assertNull(s.getNextBillingAt());
    }

    @Test
    void cancel_후_기간종료시점에_EXPIRED로_종결된다() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.cancel();
        s.expire(); // 정기결제 배치의 findCancelledPastPeriodEnd 스윕이 하는 일

        assertEquals(SubscriptionStatus.EXPIRED, s.getStatus());
        assertFalse(s.isActive());
    }

    /** 해지 예약분을 일시정지하면 resume 시 기간이 밀려 무상 연장이 된다. */
    @Test
    void cancel_예약된구독은_일시정지할수없다() {
        Subscription s = pendingBusiness();
        s.activate(LocalDateTime.now(), LocalDateTime.now().plusMonths(1));
        s.cancel();

        assertThrows(IllegalStateException.class, s::pause);
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
        s.expire();
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
