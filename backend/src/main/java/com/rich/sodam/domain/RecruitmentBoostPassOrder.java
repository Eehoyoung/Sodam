package com.rich.sodam.domain;

import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채용 부스트 무제한 패스 단건결제 주문(recruitment-monetization-gamification-plan.md §2.5, §7).
 *
 * <p>{@link com.rich.sodam.domain.AttendanceCreditChargeOrder}(출근권 충전소)와 완전히 동일한 흐름을
 * 따른다: 1) 주문 생성(PENDING, 금액·기간은 <b>생성 시점 설정값 스냅샷</b>으로 고정) → 2) FE 토스
 * 결제창 → paymentKey 획득 → 3) 서버 승인(confirm): 금액 위변조 방지(주문 금액과 일치 검증) + 멱등
 * (이미 PAID면 그대로).</p>
 *
 * <p>{@code ownerUserId}는 {@link AttendanceCreditChargeOrder}와 동일하게 {@link User}의 PK를
 * 그대로 쓴다(User 엔티티 fetch 없이 principal.getId()만으로 주문 생성이 가능해야 하므로 FK
 * 연관관계 대신 원시값을 쓰는 관례를 따른다).</p>
 */
@Entity
@Table(name = "recruitment_boost_pass_order", indexes = {
        @Index(name = "idx_rbpo_owner", columnList = "owner_user_id"),
        @Index(name = "idx_rbpo_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecruitmentBoostPassOrder {

    public enum PassOrderStatus {
        PENDING, PAID, CANCELLED, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_code", nullable = false, length = 30)
    private RecruitmentBoostPassProductCode productCode;

    /** 우리쪽 주문 식별자(토스 orderId, 멱등 단위). */
    @Column(name = "order_id", length = 80, nullable = false, unique = true)
    private String orderId;

    /** 토스 paymentKey(결제 확정 후). */
    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    /** 결제 금액(원) — 생성 시점 설정값 스냅샷으로 고정, 승인 시 이 값과 클라이언트 금액을 대조한다. */
    @Column(name = "amount_krw", nullable = false)
    private int amountKrw;

    /** 지급(연장) 기간(일) — 생성 시점 설정값 스냅샷. */
    @Column(name = "duration_days", nullable = false)
    private int durationDays;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PassOrderStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime paidAt;
    private LocalDateTime updatedAt;

    public static RecruitmentBoostPassOrder create(Long ownerUserId, RecruitmentBoostPassProductCode productCode,
                                                     String orderId, int amountKrw, int durationDays) {
        RecruitmentBoostPassOrder o = new RecruitmentBoostPassOrder();
        o.ownerUserId = ownerUserId;
        o.productCode = productCode;
        o.orderId = orderId;
        o.amountKrw = amountKrw;
        o.durationDays = durationDays;
        o.status = PassOrderStatus.PENDING;
        o.createdAt = LocalDateTime.now();
        return o;
    }

    public void markPaid(String paymentKey) {
        this.paymentKey = paymentKey;
        this.status = PassOrderStatus.PAID;
        this.paidAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void markCancelled() {
        this.status = PassOrderStatus.CANCELLED;
        this.updatedAt = LocalDateTime.now();
    }

    public void markRefunded() {
        this.status = PassOrderStatus.REFUNDED;
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isPending() {
        return status == PassOrderStatus.PENDING;
    }

    public boolean isPaid() {
        return status == PassOrderStatus.PAID;
    }

    public boolean isCancelledOrRefunded() {
        return status == PassOrderStatus.CANCELLED || status == PassOrderStatus.REFUNDED;
    }
}
