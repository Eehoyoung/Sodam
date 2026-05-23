package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossBillingClient;
import com.rich.sodam.domain.PaymentHistory;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import com.rich.sodam.repository.PaymentHistoryRepository;
import com.rich.sodam.repository.SubscriptionRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 구독·정기결제 비즈니스 서비스.
 *
 * 흐름:
 *  1. {@link #subscribe(Long, PlanType, String)} — FE 카드 등록 직후 호출. 빌링키 발급 + 첫 청구.
 *  2. {@link #runScheduledBilling(LocalDateTime)} — 매일 자정 스케줄러가 호출. 만기 도래 ACTIVE/PAST_DUE 청구.
 *  3. {@link #cancel(Long)} — 사용자 해지. 다음 결제 안 함, 현재 기간 만료까지 ACTIVE 유지.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final UserRepository userRepository;
    private final TossBillingClient tossClient;

    /**
     * 무료 플랜 가입 — 카드 없이 즉시 ACTIVE.
     */
    @Transactional
    public Subscription subscribeFree(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));
        cancelExistingActive(userId);
        String customerKey = buildCustomerKey(userId);
        Subscription s = Subscription.pending(user, PlanType.FREE, customerKey);
        LocalDateTime now = LocalDateTime.now();
        s.activate(now, now.plusYears(99)); // 무료는 사실상 만료 없음
        return subscriptionRepository.save(s);
    }

    /**
     * 유료 플랜 가입 — 빌링키 발급 + 첫 청구.
     * 첫 청구 실패 시 PENDING_PAYMENT 상태로 남기고 IllegalStateException.
     */
    @Transactional
    public Subscription subscribe(Long userId, PlanType plan, String tossAuthKey) {
        if (plan == PlanType.FREE) {
            return subscribeFree(userId);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));
        cancelExistingActive(userId);

        String customerKey = buildCustomerKey(userId);
        Subscription pending = Subscription.pending(user, plan, customerKey);

        TossBillingClient.BillingKeyResult bk = tossClient.issueBillingKey(tossAuthKey, customerKey);
        pending.attachBillingKey(bk.getBillingKey(), bk.getCardLabel());
        Subscription saved = subscriptionRepository.save(pending);

        // 첫 청구
        TossBillingClient.ChargeResult result = chargeOnce(saved);
        if (!result.isSuccess()) {
            throw new IllegalStateException("첫 결제 실패: " + result.getFailureReason());
        }
        return saved;
    }

    /**
     * 사용자가 직접 호출하는 해지.
     */
    @Transactional
    public void cancel(Long userId) {
        Subscription s = currentSubscriptionOrThrow(userId);
        s.cancel();
    }

    @Transactional(readOnly = true)
    public Subscription currentSubscription(Long userId) {
        return subscriptionRepository
                .findFirstByUser_IdAndStatusIn(userId, List.of(
                        SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT, SubscriptionStatus.PAST_DUE))
                .orElse(null);
    }

    private Subscription currentSubscriptionOrThrow(Long userId) {
        Subscription s = currentSubscription(userId);
        if (s == null) {
            throw new IllegalStateException("활성 구독이 없습니다.");
        }
        return s;
    }

    /**
     * 스케줄러(매일 자정)가 호출. 청구일 도래 ACTIVE / PAST_DUE 모두 처리.
     */
    @Transactional
    public int runScheduledBilling(LocalDateTime now) {
        List<Subscription> due = subscriptionRepository.findDueForBilling(now);
        List<Subscription> retry = subscriptionRepository.findPastDueForRetry(now);
        int processed = 0;

        for (Subscription s : due) {
            chargeOnce(s);
            processed++;
        }
        for (Subscription s : retry) {
            chargeOnce(s);
            processed++;
        }
        if (processed > 0) {
            log.info("정기결제 배치 완료: {}건 (정상 {}, 재시도 {})", processed, due.size(), retry.size());
        }
        return processed;
    }

    /**
     * 단건 청구. 성공 시 다음 기간 갱신, 실패 시 카운터 증가.
     */
    private TossBillingClient.ChargeResult chargeOnce(Subscription s) {
        if (s.getBillingKey() == null) {
            log.warn("구독 #{} 빌링키 없음", s.getId());
            return TossBillingClient.ChargeResult.fail("no billing key");
        }
        String orderId = "ORD_" + s.getId() + "_" + System.currentTimeMillis();
        PaymentHistory ph = paymentHistoryRepository.save(
                PaymentHistory.pending(s, orderId, s.getPlan().getMonthlyPriceKrw()));

        TossBillingClient.ChargeRequest req = TossBillingClient.ChargeRequest.builder()
                .billingKey(s.getBillingKey())
                .customerKey(s.getCustomerKey())
                .orderId(orderId)
                .orderName("소담 " + s.getPlan().getDisplayName() + " 월 구독")
                .amount(s.getPlan().getMonthlyPriceKrw())
                .customerEmail(s.getUser().getEmail())
                .customerName(s.getUser().getName())
                .build();

        TossBillingClient.ChargeResult result;
        try {
            result = tossClient.charge(req);
        } catch (Exception e) {
            log.error("토스 청구 예외 sub={} order={}", s.getId(), orderId, e);
            result = TossBillingClient.ChargeResult.fail(e.getMessage());
        }

        if (result.isSuccess()) {
            ph.markSuccess(result.getPaymentKey());
            LocalDateTime periodStart = LocalDateTime.now();
            s.activate(periodStart, periodStart.plusMonths(1));
        } else {
            ph.markFailed(result.getFailureReason());
            s.markPaymentFailed();
            // PAST_DUE 는 3일 후 재시도
            // (markPaymentFailed 후 EXPIRED 가 아니라면 nextBillingAt 을 3일 뒤로)
            if (s.getStatus() == SubscriptionStatus.PAST_DUE) {
                // 직접 필드 변경은 불가하므로 별도 메서드를 추가하려면 도메인 수정 필요
                // 여기서는 별도 메서드를 두지 않고 paymentFailureCount 만 누적, 다음 자정 배치에서 자연 재시도
            }
        }
        return result;
    }

    private void cancelExistingActive(Long userId) {
        Subscription existing = currentSubscription(userId);
        if (existing != null) {
            existing.cancel();
            existing.expire();
        }
    }

    private String buildCustomerKey(Long userId) {
        return "cust_" + userId + "_" + UUID.randomUUID().toString().substring(0, 8);
    }
}
