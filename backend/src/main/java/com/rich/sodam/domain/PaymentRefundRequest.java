package com.rich.sodam.domain;

import com.rich.sodam.domain.type.PaymentSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

/** 사용자 환불 신청과 PG 취소 결과를 분리해 보존하는 감사 가능한 상태 머신. */
@Entity
@Table(name = "payment_refund_request", uniqueConstraints = {
        @UniqueConstraint(name = "uq_payment_refund_source", columnNames = {"source_type", "source_order_id"})
}, indexes = {
        @Index(name = "idx_payment_refund_owner", columnList = "owner_user_id"),
        @Index(name = "idx_payment_refund_source", columnList = "source_type,source_order_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentRefundRequest {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    public enum Status { REQUESTED, PROCESSING, COMPLETED, FAILED }
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false, length = 40) private PaymentSourceType sourceType;
    @Column(name = "source_order_id", nullable = false, length = 80) private String sourceOrderId;
    @Column(name = "owner_user_id", nullable = false) private Long ownerUserId;
    @Column(name = "reason", nullable = false, length = 500) private String reason;
    @Column(name = "amount_krw", nullable = false) private int amountKrw;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @Column(name = "failure_reason", length = 300) private String failureReason;
    /**
     * PG 취소가 실제로 성공한 시각. 후속 처리(권리 회수·증빙 취소)가 실패해도 이 값은 남으므로,
     * 재시도가 이미 환불된 결제를 다시 취소하지 않는다.
     */
    @Column(name = "pg_cancelled_at") private LocalDateTime pgCancelledAt;
    @Column(name = "attempt_count", nullable = false) private int attemptCount;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private LocalDateTime updatedAt;

    public static PaymentRefundRequest request(PaymentSourceType sourceType, String sourceOrderId,
                                               Long ownerUserId, String reason, int amountKrw) {
        PaymentRefundRequest request = new PaymentRefundRequest();
        request.sourceType = sourceType; request.sourceOrderId = sourceOrderId; request.ownerUserId = ownerUserId;
        request.reason = reason; request.amountKrw = amountKrw; request.status = Status.REQUESTED;
        request.createdAt = LocalDateTime.now(SEOUL);
        return request;
    }
    public void markProcessing() {
        this.status = Status.PROCESSING;
        this.attemptCount++;
        this.updatedAt = LocalDateTime.now(SEOUL);
    }
    public void markPgCancelled() { this.pgCancelledAt = LocalDateTime.now(SEOUL); this.updatedAt = this.pgCancelledAt; }
    public void markCompleted() { this.status = Status.COMPLETED; this.failureReason = null; this.completedAt = LocalDateTime.now(SEOUL); this.updatedAt = this.completedAt; }
    public void markFailed(String reason) { this.status = Status.FAILED; this.failureReason = reason; this.updatedAt = LocalDateTime.now(SEOUL); }
    public boolean isActive() { return status == Status.REQUESTED || status == Status.PROCESSING; }
    /** PG 취소가 이미 성공했는지 — 재시도 시 중복 취소 호출을 막는 판단 기준. */
    public boolean isPgCancelled() { return pgCancelledAt != null; }

    /**
     * 실패로 끝난 신청을 다시 대기 상태로 돌린다. 주문당 신청 row 는 하나(uq_payment_refund_source)
     * 이므로, 재시도 경로가 없으면 실패한 환불이 영구히 고착된다.
     */
    public void markRetryQueued() {
        this.status = Status.REQUESTED;
        this.updatedAt = LocalDateTime.now(SEOUL);
    }
}
