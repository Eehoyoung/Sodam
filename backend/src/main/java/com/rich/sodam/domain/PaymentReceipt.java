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

    /**
     * 발급 상태.
     *
     * <p>{@code AMEND_PENDING} 은 <b>이미 발급된 증빙이 환불된</b> 상태다 — 부가가치세법 시행령 §70상
     * 수정세금계산서를 발급해야 하므로 내부적으로 CANCELLED 로 끝내면 안 된다(G-11 선결 2).
     * 수정 통지가 성공해야 CANCELLED 로 넘어간다.</p>
     */
    public enum Status { POLICY_PENDING, QUEUED, ISSUED, FAILED, AMEND_PENDING, CANCELLED }

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
    /**
     * 수취액 중 <b>제3자에게 그대로 전달되는 예수금</b>(대리수취분). 소담의 매출이 아니다.
     *
     * <p>세무 서비스 상품이 유일한 사례다 — 사장님이 내는 금액이
     * {@code referralFee(소담 매출) + partnerPayable(세무사 전달분)} 구조라, 전액을 공급가액으로
     * 발급하면 <b>부가세 과세표준이 실매출보다 과대계상</b>된다(G-11 선결 1). 다른 과금은 0.</p>
     */
    @Column(name = "pass_through_amount_krw", nullable = false)
    private int passThroughAmountKrw;
    @Enumerated(EnumType.STRING) @Column(name = "document_type", nullable = false, length = 30)
    private FiscalDocumentType documentType;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30)
    private Status status;
    @Column(name = "issuer_reference", length = 160)
    private String issuerReference;
    @Column(name = "failure_reason", length = 300)
    private String failureReason;
    /** 수정세금계산서(취소·감액) 발급 대행사 참조번호. */
    @Column(name = "amendment_reference", length = 160)
    private String amendmentReference;
    @Column(name = "amended_at")
    private LocalDateTime amendedAt;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    private LocalDateTime issuedAt;
    private LocalDateTime updatedAt;

    public static PaymentReceipt create(PaymentSourceType sourceType, String sourceOrderId, Long ownerUserId,
                                        String paymentKey, int amountKrw, FiscalDocumentType documentType) {
        return create(sourceType, sourceOrderId, ownerUserId, paymentKey, amountKrw, 0, documentType);
    }

    public static PaymentReceipt create(PaymentSourceType sourceType, String sourceOrderId, Long ownerUserId,
                                        String paymentKey, int amountKrw, int passThroughAmountKrw,
                                        FiscalDocumentType documentType) {
        PaymentReceipt receipt = new PaymentReceipt();
        receipt.sourceType = sourceType;
        receipt.sourceOrderId = sourceOrderId;
        receipt.ownerUserId = ownerUserId;
        receipt.paymentKey = paymentKey;
        receipt.amountKrw = amountKrw;
        receipt.passThroughAmountKrw = Math.max(0, Math.min(passThroughAmountKrw, amountKrw));
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

    /**
     * 부가세 과세표준 후보 — 수취액에서 대리수취 예수금을 뺀 <b>소담의 실매출</b>.
     *
     * <p>⚠️ 이 값을 그대로 공급가액으로 쓸지, 아니면 전액({@link #getAmountKrw()})을 쓰고 예수금을
     * 매입으로 처리할지는 <b>G-11 Q1·Q2 세무사 회신 사항</b>이다. 현재는 대리수취 구조상 보수적인
     * 쪽(예수금 제외)을 기본으로 두고, 회신이 오면 이 메서드 하나만 바꾸면 된다.</p>
     */
    public int taxableAmountKrw() { return amountKrw - passThroughAmountKrw; }

    /**
     * 이미 발급된 증빙이라 취소 시 <b>수정세금계산서 통지가 필요한지</b>(시행령 §70).
     * 발급 전(POLICY_PENDING·QUEUED·FAILED)이라면 통지할 원본이 없으므로 그냥 취소하면 된다.
     */
    public boolean requiresAmendment() { return status == Status.ISSUED; }

    /** 수정 통지 대기로 전환. 이 상태로 남아 있으면 세무 의무가 미이행 상태라는 뜻이다. */
    public void markAmendPending() {
        this.status = Status.AMEND_PENDING;
        this.updatedAt = LocalDateTime.now(SEOUL);
    }

    /** 수정세금계산서 통지 성공 — 여기서만 CANCELLED 로 종결된다. */
    public void markAmended(String amendmentReference) {
        this.status = Status.CANCELLED;
        this.amendmentReference = amendmentReference;
        this.failureReason = null;
        this.amendedAt = LocalDateTime.now(SEOUL);
        this.updatedAt = this.amendedAt;
    }

    /** 수정 통지 실패 — AMEND_PENDING 을 유지해 재시도·수동 확인 대상으로 남긴다. */
    public void markAmendFailed(String reason) {
        this.status = Status.AMEND_PENDING;
        this.failureReason = reason;
        this.updatedAt = LocalDateTime.now(SEOUL);
    }
}
