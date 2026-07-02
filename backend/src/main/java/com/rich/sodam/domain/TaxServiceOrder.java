package com.rich.sodam.domain;

import com.rich.sodam.domain.type.TaxPackage;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 세무 패키지 단건결제 주문(대리수취). 확정안 §4-1·§5.
 *
 * 회계: customerAmount(예수금) = referralFee(소담 매출) + partnerPayable(세무사 전달분).
 * 결제는 토스 단건결제로 즉시 수금(미수금 0), 세무사 지급은 월 net 정산(별도·지급대행 계약 선행).
 */
@Entity
@Table(name = "tax_service_order", indexes = {
        @Index(name = "idx_tax_order_user", columnList = "user_id"),
        @Index(name = "idx_tax_order_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaxServiceOrder {

    public enum OrderStatus {
        PENDING, PAID, CANCELLED, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tax_service_order_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "package_type", nullable = false, length = 40)
    private TaxPackage packageType;

    /** 우리쪽 주문 식별자(토스 orderId, 멱등 단위). */
    @Column(name = "order_id", length = 80, nullable = false, unique = true)
    private String orderId;

    /** 토스 paymentKey(결제 확정 후). */
    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    /** 고객 수취(예수금). */
    @Column(nullable = false)
    private int customerAmount;

    /** 소담 매출(송객수수료). */
    @Column(nullable = false)
    private int referralFee;

    /** 세무사 전달분(예수금 부채). */
    @Column(nullable = false)
    private int partnerPayable;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime paidAt;
    private LocalDateTime updatedAt;

    public static TaxServiceOrder create(User user, TaxPackage pkg, String orderId) {
        TaxServiceOrder o = new TaxServiceOrder();
        o.user = user;
        o.packageType = pkg;
        o.orderId = orderId;
        o.customerAmount = pkg.getCustomerAmount();
        o.referralFee = pkg.getReferralFee();
        o.partnerPayable = pkg.partnerPayable();
        o.status = OrderStatus.PENDING;
        o.createdAt = LocalDateTime.now();
        return o;
    }

    public void markPaid(String paymentKey) {
        this.paymentKey = paymentKey;
        this.status = OrderStatus.PAID;
        this.paidAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = OrderStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    public void markRefunded() {
        this.status = OrderStatus.REFUNDED;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isPaid() {
        return status == OrderStatus.PAID;
    }
}
