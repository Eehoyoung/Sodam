package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.domain.type.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

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
    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;

    /** 결제 실패 누적 횟수 — 3회 도달 시 EXPIRED. */
    @Column(nullable = false)
    private Integer paymentFailureCount = 0;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public static Subscription pending(User user, PlanType plan, String customerKey) {
        Subscription s = new Subscription();
        s.user = user;
        s.plan = plan;
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
}
