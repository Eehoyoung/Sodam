package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 결제취소 웹훅에 의한 재화/기간 회수(claw-back) 감사 로그(recruitment-monetization-gamification-plan.md
 * §12.2 — 세무 검토 "환불금액과 회수량 연동 및 추후 소명 가능한 조회 경로" 필수 지적 대응).
 *
 * <p>기존에는 {@code log.warn} 텍스트 한 줄로만 남아 로그 로테이션 후 소실될 수 있었다 — 세무조사
 * 대응 시 "이 주문이 왜 이만큼만 회수됐는지"를 DB에서 바로 조회할 수 있도록 별도 테이블에 남긴다.
 * 한 웹훅 이벤트가 여러 수량 차원(출근권 개수·스트릭복구권 장수·패스 일수)을 함께 회수할 수 있어,
 * 차원(quantityUnit)마다 별도 행으로 기록한다({@link StoreDelegationAudit} 관례와 동일하게 정적
 * 팩토리 {@link #of}만 노출하고 세터는 없음 — 감사 로그는 불변).</p>
 */
@Entity
@Table(name = "payment_cancel_reversal_audit", indexes = {
        @Index(name = "idx_pcra_order", columnList = "order_id"),
        @Index(name = "idx_pcra_owner", columnList = "owner_user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentCancelReversalAudit {

    /** 이 회수가 어느 주문 트랙에서 발생했는지. */
    public enum OrderType { ATTENDANCE_CREDIT_CHARGE, RECRUITMENT_BOOST_PASS }

    /** 회수 대상 수량의 단위 — 같은 주문이라도 차원별로 별도 행을 남긴다. */
    public enum QuantityUnit { CREDIT, STREAK_RECOVERY_TICKET, BOOST_PASS_DAY }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 40)
    private OrderType orderType;

    @Column(name = "order_id", nullable = false, length = 80)
    private String orderId;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    /** 웹훅 payload의 결제 상태 원문(예: CANCELED, PARTIAL_CANCELED). */
    @Column(name = "webhook_status", nullable = false, length = 20)
    private String webhookStatus;

    /** 이 주문의 원래 결제 금액(원). */
    @Column(name = "original_amount_krw", nullable = false)
    private int originalAmountKrw;

    /** 웹훅에서 해석해낸 이번 취소 금액(원) — 파싱 실패로 해석 불가했으면 null(전액취소로 안전 폴백됐다는 뜻). */
    @Column(name = "resolved_cancel_amount_krw")
    private Integer resolvedCancelAmountKrw;

    /** 취소 비율(0.000000 ~ 1.000000). */
    @Column(name = "cancel_ratio", nullable = false, precision = 8, scale = 6)
    private BigDecimal cancelRatio;

    @Enumerated(EnumType.STRING)
    @Column(name = "quantity_unit", nullable = false, length = 30)
    private QuantityUnit quantityUnit;

    /** 취소 비율대로 계산했을 때 회수했어야 할 수량(버림 계산 후 값). */
    @Column(name = "requested_reverse_quantity", nullable = false)
    private int requestedReverseQuantity;

    /** 실제로 회수된 수량 — 이미 다른 소모로 써버린 만큼은 0 하한 clamp로 줄어들 수 있다(요청과 다르면 부족분 발생). */
    @Column(name = "actual_reverse_quantity", nullable = false)
    private int actualReverseQuantity;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public static PaymentCancelReversalAudit of(OrderType orderType, String orderId, Long ownerUserId,
                                                 String webhookStatus, int originalAmountKrw,
                                                 Integer resolvedCancelAmountKrw, BigDecimal cancelRatio,
                                                 QuantityUnit quantityUnit, int requestedReverseQuantity,
                                                 int actualReverseQuantity) {
        PaymentCancelReversalAudit audit = new PaymentCancelReversalAudit();
        audit.orderType = orderType;
        audit.orderId = orderId;
        audit.ownerUserId = ownerUserId;
        audit.webhookStatus = webhookStatus;
        audit.originalAmountKrw = originalAmountKrw;
        audit.resolvedCancelAmountKrw = resolvedCancelAmountKrw;
        audit.cancelRatio = cancelRatio;
        audit.quantityUnit = quantityUnit;
        audit.requestedReverseQuantity = requestedReverseQuantity;
        audit.actualReverseQuantity = actualReverseQuantity;
        audit.createdAt = LocalDateTime.now();
        return audit;
    }
}
