package com.rich.sodam.domain;

import com.rich.sodam.domain.type.FiscalDocumentType;
import com.rich.sodam.domain.type.PaymentSourceType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 결제별 세금계산서·현금영수증 발급 상태. 과금 원본별로 한 행만 두어 afterCommit 재시도에도
 * 중복 발급되지 않게 한다. 발급 대상 판단은 {@link FiscalDocumentType#NONE} 기본값으로 보류한다.
 */
@Entity
@Table(name = "payment_receipt", uniqueConstraints = {
        @UniqueConstraint(name = "uq_payment_receipt_source", columnNames = {"source_type", "source_order_id"})
}, indexes = {
        @Index(name = "idx_payment_receipt_owner", columnList = "owner_user_id"),
        @Index(name = "idx_payment_receipt_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PaymentReceipt {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    public enum Status { POLICY_PENDING, QUEUED, ISSUED, FAILED, CANCELLED }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING) @Column(name = "source_type", nullable = false, length = 40)
    private PaymentSourceType sourceType;
    @Column(name = "source_order_id", nullable = false, length = 80)
    private String sourceOrderId;
    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;
    @Column(name = "payment_key", length = 200)
    private String paymentKey;
    @Column(name = "amount_krw", nullable = false)
    private int amountKrw;
    @Enumerated(EnumType.STRING) @Column(name = "document_type", nullable = false, length = 30)
    private FiscalDocumentType documentType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private Status status;
    @Column(name = "issuer_reference", length = 160)
    private String issuerReference;
    @Column(name = "failure_reason", length = 300)
    private String failureReason;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    private LocalDateTime issuedAt;
    private LocalDateTime updatedAt;

    public static PaymentReceipt create(PaymentSourceType sourceType, String sourceOrderId, Long ownerUserId,
                                        String paymentKey, int amountKrw, FiscalDocumentType documentType) {
        PaymentReceipt receipt = new PaymentReceipt();
        receipt.sourceType = sourceType;
        receipt.sourceOrderId = sourceOrderId;
        receipt.ownerUserId = ownerUserId;
        receipt.paymentKey = paymentKey;
        receipt.amountKrw = amountKrw;
        receipt.documentType = documentType;
        receipt.status = documentType == FiscalDocumentType.NONE ? Status.POLICY_PENDING : Status.QUEUED;
        receipt.createdAt = LocalDateTime.now(SEOUL);
        return receipt;
    }

    public boolean isIssuable() { return status == Status.QUEUED || status == Status.FAILED; }
    public void markIssued(String issuerReference) {
        this.status = Status.ISSUED;
        this.issuerReference = issuerReference;
        this.failureReason = null;
        this.issuedAt = LocalDateTime.now(SEOUL);
        this.updatedAt = this.issuedAt;
    }
    public void markFailed(String reason) { this.status = Status.FAILED; this.failureReason = reason; this.updatedAt = LocalDateTime.now(SEOUL); }
    public void markCancelled() { this.status = Status.CANCELLED; this.updatedAt = LocalDateTime.now(SEOUL); }
}
