package com.rich.sodam.domain;

import com.rich.sodam.domain.type.BillingCycle;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 사장님(MASTER) 단위 구독 엔티티.
 * 한 사용자에 대해 ACTIVE 상태 구독은 동시에 최대 1건.
 */
@Entity
@Table(name = "subscription", indexes = {
        @Index(name = "idx_subscription_user", columnList = "user_id"),
        @Index(name = "idx_subscription_status", columnList = "status"),
        @Index(name = "idx_subscription_next_billing", columnList = "nextBillingAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subscription_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PlanType plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status;

    /** 청구 주기(월/반년/연). 연·반년납은 선결제 할인. */
    @Enumerated(EnumType.STRING)
    @Column(name = "billing_cycle", nullable = false, length = 20)
    private BillingCycle billingCycle = BillingCycle.MONTHLY;

    /** 토스페이먼츠 빌링키 (카드 식별자). 실 카드번호는 절대 저장 X. */
    @Column(name = "billing_key", length = 200)
    private String billingKey;

    /** 카드 마스킹 표시용 (예: "신한카드 5678") — 사용자에게 보여줄 안전 텍스트만. */
    @Column(name = "card_label", length = 60)
    private String cardLabel;

    /** 토스 customerKey — 사용자 식별용 영문 키. */
    @Column(name = "customer_key", length = 60, nullable = false)
    private String customerKey;

    private LocalDateTime startedAt;
    private LocalDateTime currentPeriodStartAt;
    private LocalDateTime currentPeriodEndAt;
    private LocalDateTime nextBillingAt;
    private LocalDateTime pausedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;

    /** 90일 슬립: 비활성 무료 계정을 MAU 집계에서 정화하기 위한 휴면 표시. 재활동 시 해제. */
    private LocalDateTime dormantAt;

    /** 결제 실패 누적 횟수 — 3회 도달 시 EXPIRED. */
    @Column(nullable = false)
    private Integer paymentFailureCount = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static Subscription pending(User user, PlanType plan, String customerKey) {
        return pending(user, plan, BillingCycle.MONTHLY, customerKey);
    }

    public static Subscription pending(User user, PlanType plan, BillingCycle cycle, String customerKey) {
        Subscription s = new Subscription();
        s.user = user;
        s.plan = plan;
        s.billingCycle = (cycle == null ? BillingCycle.MONTHLY : cycle);
        s.status = SubscriptionStatus.PENDING_PAYMENT;
        s.customerKey = customerKey;
        s.paymentFailureCount = 0;
        s.createdAt = LocalDateTime.now();
        return s;
    }

    public void attachBillingKey(String billingKey, String cardLabel) {
        this.billingKey = billingKey;
        this.cardLabel = cardLabel;
        this.updatedAt = LocalDateTime.now();
    }

    public void activate(LocalDateTime periodStart, LocalDateTime periodEnd) {
        this.status = SubscriptionStatus.ACTIVE;
        if (this.startedAt == null) {
            this.startedAt = periodStart;
        }
        this.currentPeriodStartAt = periodStart;
        this.currentPeriodEndAt = periodEnd;
        this.nextBillingAt = periodEnd;
        this.paymentFailureCount = 0;
        this.updatedAt = LocalDateTime.now();
    }

    public void markPaymentFailed() {
        this.paymentFailureCount = (this.paymentFailureCount == null ? 0 : this.paymentFailureCount) + 1;
        if (this.paymentFailureCount >= 3) {
            this.status = SubscriptionStatus.EXPIRED;
            this.expiredAt = LocalDateTime.now();
        } else {
            this.status = SubscriptionStatus.PAST_DUE;
        }
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 결제 실패 후 PAST_DUE 일 때 다음 재시도 시각을 미룬다.
     * (과거: nextBillingAt 미연장으로 매 자정 배치가 무한 반복청구하던 죽은코드 → 수정)
     */
    public void scheduleRetry(int days) {
        this.nextBillingAt = LocalDateTime.now().plusDays(days);
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 비수기 일시정지. ACTIVE 에서만 가능. 청구는 보류되고 남은 기간은 resume 시 보존된다.
     */
    public void pause() {
        if (status != SubscriptionStatus.ACTIVE) {
            throw new IllegalStateException("활성 구독만 일시정지할 수 있습니다. 현재 상태: " + status);
        }
        this.status = SubscriptionStatus.PAUSED;
        this.pausedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * 일시정지 해제. 정지 기간만큼 기간 종료일·다음 청구일을 미뤄 결제한 기간 손실이 없게 한다.
     */
    public void resume() {
        if (status != SubscriptionStatus.PAUSED) {
            throw new IllegalStateException("일시정지 상태만 재개할 수 있습니다. 현재 상태: " + status);
        }
        long pausedDays = pausedAt == null ? 0 : Duration.between(pausedAt, LocalDateTime.now()).toDays();
        if (this.currentPeriodEndAt != null) {
            this.currentPeriodEndAt = this.currentPeriodEndAt.plusDays(pausedDays);
        }
        if (this.nextBillingAt != null) {
            this.nextBillingAt = this.nextBillingAt.plusDays(pausedDays);
        }
        this.status = SubscriptionStatus.ACTIVE;
        this.pausedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (this.status == SubscriptionStatus.CANCELLED || this.status == SubscriptionStatus.EXPIRED) {
            return;
        }
        this.status = SubscriptionStatus.CANCELLED;
        this.cancelledAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void expire() {
        this.status = SubscriptionStatus.EXPIRED;
        this.expiredAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return status == SubscriptionStatus.ACTIVE;
    }

    /** 90일 비활성 무료 계정을 휴면 처리(MAU 정화). 상태는 유지, 플래그만 설정. */
    public void markDormant() {
        this.dormantAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isDormant() {
        return dormantAt != null;
    }
}
