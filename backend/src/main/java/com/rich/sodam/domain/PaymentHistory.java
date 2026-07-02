package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 정기결제 시도/성공/실패 이력.
 * 분쟁 대비를 위해 최소 5년 보관 (운영 시 별도 정책).
 */
@Entity
@Table(name = "payment_history", indexes = {
        @Index(name = "idx_payment_history_subscription", columnList = "subscription_id"),
        @Index(name = "idx_payment_history_status", columnList = "status"),
        @Index(name = "idx_payment_history_billed_at", columnList = "billedAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentHistory {

    public enum PaymentStatus {
        SUCCESS, FAILED, REFUNDED, PENDING
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_history_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id", nullable = false)
    private Subscription subscription;

    /** 토스페이먼츠 paymentKey */
    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    /** 우리쪽에서 발행한 멱등 키 (orderId) */
    @Column(name = "order_id", length = 80, nullable = false, unique = true)
    private String orderId;

    /**
     * 청구 대상 기간(yyyy-MM). 동일 구독·동일 기간에 SUCCESS 가 1건이면 재청구를 멱등 차단한다.
     * (과거: orderId 가 매회 millis 라 웹훅/배치 재실행 시 이중청구 위험 → 기간 기준 멱등으로 수정)
     */
    @Column(name = "billing_period", length = 7)
    private String billingPeriod;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    @Column(length = 200)
    private String failureReason;

    @Column(nullable = false)
    private LocalDateTime billedAt;

    private LocalDateTime updatedAt;

    public static PaymentHistory pending(Subscription subscription, String orderId, int amount) {
        return pending(subscription, orderId, amount, null);
    }

    public static PaymentHistory pending(Subscription subscription, String orderId, int amount, String billingPeriod) {
        PaymentHistory p = new PaymentHistory();
        p.subscription = subscription;
        p.orderId = orderId;
        p.amount = amount;
        p.billingPeriod = billingPeriod;
        p.status = PaymentStatus.PENDING;
        p.billedAt = LocalDateTime.now();
        return p;
    }

    public void markSuccess(String paymentKey) {
        this.paymentKey = paymentKey;
        this.status = PaymentStatus.SUCCESS;
        this.updatedAt = LocalDateTime.now();
    }

    public void markFailed(String reason) {
        this.status = PaymentStatus.FAILED;
        this.failureReason = reason;
        this.updatedAt = LocalDateTime.now();
    }

    public void markRefunded() {
        this.status = PaymentStatus.REFUNDED;
        this.updatedAt = LocalDateTime.now();
    }
}
