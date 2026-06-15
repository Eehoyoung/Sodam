package com.rich.sodam.service;

import com.rich.sodam.config.integration.TossBillingClient;
import com.rich.sodam.domain.PaymentHistory;
import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.BillingCycle;
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
import java.time.YearMonth;
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
     * 유료 플랜 가입 — 빌링키 발급 + 첫 청구 (월납 기본).
     */
    @Transactional
    public Subscription subscribe(Long userId, PlanType plan, String tossAuthKey) {
        return subscribe(userId, plan, BillingCycle.MONTHLY, tossAuthKey);
    }

    /**
     * 유료 플랜 가입 — 빌링키 발급 + 첫 청구. 청구 주기(월/반년/연) 선택.
     * 첫 청구 실패 시 PENDING_PAYMENT 상태로 남기고 IllegalStateException.
     */
    @Transactional
    public Subscription subscribe(Long userId, PlanType plan, BillingCycle cycle, String tossAuthKey) {
        if (plan == PlanType.FREE) {
            return subscribeFree(userId);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("user not found: " + userId));
        cancelExistingActive(userId);

        String customerKey = buildCustomerKey(userId);
        Subscription pending = Subscription.pending(user, plan, cycle, customerKey);

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

    /**
     * 비수기 일시정지(청구 보류). 활성 구독에만 가능.
     */
    @Transactional
    public Subscription pause(Long userId) {
        Subscription s = currentSubscriptionOrThrow(userId);
        s.pause();
        return s;
    }

    /**
     * 일시정지 해제. 정지 기간만큼 기간이 뒤로 밀린다.
     */
    @Transactional
    public Subscription resume(Long userId) {
        Subscription s = subscriptionRepository
                .findFirstByUser_IdAndStatusIn(userId, List.of(SubscriptionStatus.PAUSED))
                .orElseThrow(() -> new IllegalStateException("일시정지된 구독이 없습니다."));
        s.resume();
        return s;
    }

    @Transactional(readOnly = true)
    public Subscription currentSubscription(Long userId) {
        return subscriptionRepository
                .findFirstByUser_IdAndStatusIn(userId, List.of(
                        SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING_PAYMENT,
                        SubscriptionStatus.PAST_DUE, SubscriptionStatus.PAUSED))
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
     * 단건 청구. 성공 시 다음 기간 갱신, 실패 시 카운터 증가 + 재시도 일정 연장.
     *
     * 멱등성(🔴 수정): orderId 를 millis 가 아니라 (구독ID + 청구년월 + 시도번호)로 발급하고,
     * 동일 구독·동일 청구년월에 SUCCESS 가 이미 있으면 재청구하지 않고 기간만 전진시킨다.
     * → 웹훅/배치 재실행 시 이중청구를 차단.
     */
    private TossBillingClient.ChargeResult chargeOnce(Subscription s) {
        if (s.getBillingKey() == null) {
            log.warn("구독 #{} 빌링키 없음", s.getId());
            return TossBillingClient.ChargeResult.fail("no billing key");
        }

        BillingCycle cycle = s.getBillingCycle();
        String period = YearMonth.now().toString(); // yyyy-MM

        // 멱등: 동일 기간 성공 결제가 이미 있으면 재청구 없이 기간만 전진
        if (paymentHistoryRepository.existsBySubscription_IdAndBillingPeriodAndStatus(
                s.getId(), period, PaymentHistory.PaymentStatus.SUCCESS)) {
            log.info("멱등 스킵: 이미 결제 완료 sub={} period={}", s.getId(), period);
            LocalDateTime now = LocalDateTime.now();
            s.activate(now, cycle.periodEndFrom(now));
            return TossBillingClient.ChargeResult.ok(null);
        }

        long attempt = paymentHistoryRepository.countBySubscription_IdAndBillingPeriod(s.getId(), period) + 1;
        String orderId = "ORD_" + s.getId() + "_" + period.replace("-", "") + "_" + attempt;
        int amount = cycle.amountFor(s.getPlan());

        PaymentHistory ph = paymentHistoryRepository.save(
                PaymentHistory.pending(s, orderId, amount, period));

        TossBillingClient.ChargeRequest req = TossBillingClient.ChargeRequest.builder()
                .billingKey(s.getBillingKey())
                .customerKey(s.getCustomerKey())
                .orderId(orderId)
                .orderName("소담 " + s.getPlan().getDisplayName() + " " + cycle.getDisplayName())
                .amount(amount)
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
            s.activate(periodStart, cycle.periodEndFrom(periodStart));
        } else {
            ph.markFailed(result.getFailureReason());
            s.markPaymentFailed();
            // 🔴 수정: PAST_DUE 면 다음 청구일을 3일 뒤로 연장(이전엔 미연장 → 매 자정 무한 반복청구)
            if (s.getStatus() == SubscriptionStatus.PAST_DUE) {
                s.scheduleRetry(3);
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
