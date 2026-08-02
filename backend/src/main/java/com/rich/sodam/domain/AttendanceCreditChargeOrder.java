package com.rich.sodam.domain;

import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 출근권 충전소(IAP) 단건결제 주문(recruitment-monetization-gamification-plan.md §2.4, §7).
 *
 * <p>{@code TaxServiceOrder}(세무 패키지 단건결제)와 동일한 흐름을 따른다: 1) 주문 생성(PENDING,
 * 금액·수량은 <b>생성 시점 설정값 스냅샷</b>으로 고정) → 2) FE 토스 결제창 → paymentKey 획득 →
 * 3) 서버 승인(confirm): 금액 위변조 방지(주문 금액과 일치 검증) + 멱등(이미 PAID면 그대로).</p>
 *
 * <p>{@code ownerUserId}는 {@link AttendanceCredit}과 동일하게 {@link User}의 PK를 그대로 쓴다
 * (User 엔티티 fetch 없이 principal.getId()만으로 주문 생성이 가능해야 하므로 FK 연관관계 대신
 * 원시값을 쓰는 AttendanceCredit 계열 관례를 따른다).</p>
 *
 * <p>{@code bonusCreditQuantity}는 주문 생성 시점이 아니라 <b>결제 승인이 실제로 반영되는 시점</b>에
 * 정해진다(첫 구매 여부는 그 순간의 지갑 상태로 판정 — {@code AttendanceCreditService#grantCharge}).
 * 그래서 생성 시점엔 0으로 비워두고 승인 시 채운다.</p>
 */
@Entity
@Table(name = "attendance_credit_charge_order", indexes = {
        @Index(name = "idx_acco_owner", columnList = "owner_user_id"),
        @Index(name = "idx_acco_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceCreditChargeOrder {

    public enum ChargeOrderStatus {
        PENDING, PAID, CANCELLED, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "pack_code", nullable = false, length = 30)
    private AttendanceCreditChargePackCode packCode;

    /** 우리쪽 주문 식별자(토스 orderId, 멱등 단위). */
    @Column(name = "order_id", length = 80, nullable = false, unique = true)
    private String orderId;

    /** 토스 paymentKey(결제 확정 후). */
    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    /** 결제 금액(원) — 생성 시점 설정값 스냅샷으로 고정, 승인 시 이 값과 클라이언트 금액을 대조한다. */
    @Column(name = "amount_krw", nullable = false)
    private int amountKrw;

    /** 기본 지급 출근권 수량(보너스 제외, 생성 시점 설정값 스냅샷). 스트릭 복구권 단독 구매는 0. */
    @Column(name = "credit_quantity", nullable = false)
    private int creditQuantity;

    /** 첫 구매 2배 이벤트로 추가 지급된 수량 — 결제 승인 시점에 결정되어 채워진다(생성 시엔 0). */
    @Column(name = "bonus_credit_quantity", nullable = false)
    private int bonusCreditQuantity;

    /** 지급 티켓(스트릭 복구권) 수량 — 0 또는 1. */
    @Column(name = "ticket_quantity", nullable = false)
    private int ticketQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChargeOrderStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime paidAt;
    private LocalDateTime updatedAt;

    public static AttendanceCreditChargeOrder create(Long ownerUserId, AttendanceCreditChargePackCode packCode,
                                                       String orderId, int amountKrw, int creditQuantity,
                                                       int ticketQuantity) {
        AttendanceCreditChargeOrder o = new AttendanceCreditChargeOrder();
        o.ownerUserId = ownerUserId;
        o.packCode = packCode;
        o.orderId = orderId;
        o.amountKrw = amountKrw;
        o.creditQuantity = creditQuantity;
        o.bonusCreditQuantity = 0;
        o.ticketQuantity = ticketQuantity;
        o.status = ChargeOrderStatus.PENDING;
        o.createdAt = LocalDateTime.now();
        return o;
    }

    public void markPaid(String paymentKey, int bonusCreditQuantity) {
        this.paymentKey = paymentKey;
        this.bonusCreditQuantity = bonusCreditQuantity;
        this.status = ChargeOrderStatus.PAID;
        this.paidAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markCancelled() {
        this.status = ChargeOrderStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    public void markRefunded() {
        this.status = ChargeOrderStatus.REFUNDED;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isPending() {
        return status == ChargeOrderStatus.PENDING;
    }

    public boolean isPaid() {
        return status == ChargeOrderStatus.PAID;
    }

    public boolean isCancelledOrRefunded() {
        return status == ChargeOrderStatus.CANCELLED || status == ChargeOrderStatus.REFUNDED;
    }

    /** 이 주문으로 실제 지급된(될) 출근권 총량 — 기본 + 첫구매 보너스. */
    public int totalCreditQuantity() {
        return creditQuantity + bonusCreditQuantity;
    }
}
