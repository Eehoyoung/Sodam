package com.rich.sodam.service;

import com.rich.sodam.config.FiscalReceiptProperties;
import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.domain.type.PaymentSourceType;
import com.rich.sodam.repository.PaymentReceiptRepository;
import com.rich.sodam.service.support.AfterCommitExecutor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** 모든 과금의 성공 결제 직후 호출되는 증빙 등록 관문. 원본 주문은 그대로 유지한다. */
@Service
@RequiredArgsConstructor
public class PaymentReceiptService {
    private final PaymentReceiptRepository receiptRepository;
    private final FiscalReceiptProperties properties;
    private final AfterCommitExecutor afterCommitExecutor;
    private final PaymentReceiptIssuanceService issuanceService;

    @Transactional
    public void recordPaid(PaymentSourceType sourceType, String orderId, Long ownerUserId, String paymentKey, int amountKrw) {
        recordPaid(sourceType, orderId, ownerUserId, paymentKey, amountKrw, 0);
    }

    /**
     * 대리수취 예수금이 섞인 결제의 증빙 등록.
     *
     * @param passThroughAmountKrw 수취액 중 제3자에게 그대로 전달되는 예수금(소담 매출이 아님).
     *                             과세표준 과대계상을 막는다 — G-11 선결 1
     */
    @Transactional
    public void recordPaid(PaymentSourceType sourceType, String orderId, Long ownerUserId, String paymentKey,
                           int amountKrw, int passThroughAmountKrw) {
        PaymentReceipt receipt = receiptRepository.findBySourceTypeAndSourceOrderId(sourceType, orderId)
                .orElseGet(() -> receiptRepository.save(PaymentReceipt.create(sourceType, orderId, ownerUserId,
                        paymentKey, amountKrw, passThroughAmountKrw, properties.getDefaultDocumentType())));
        if (receipt.isIssuable()) {
            afterCommitExecutor.execute(() -> issuanceService.issue(receipt.getId()));
        }
    }

    @Transactional(readOnly = true)
    public List<PaymentReceipt> myReceipts(Long ownerUserId) {
        return receiptRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }

    @Transactional
    public void cancel(PaymentSourceType sourceType, String orderId) {
        cancel(sourceType, orderId, 0, "REFUND");
    }

    /**
     * 환불에 따른 증빙 취소·감액.
     *
     * <p><b>이미 발급된 건은 내부 상태만 바꿔서는 안 된다</b> — 부가가치세법 시행령 §70상
     * 수정세금계산서를 발급해야 한다(G-11 선결 2). 발급 전이면 통지할 원본이 없으므로 그대로 취소한다.
     * 외부 통지는 발급과 마찬가지로 트랜잭션 커밋 후에 실행한다(api-design.md).</p>
     *
     * @param remainingTaxableAmountKrw 수정 후 남는 과세표준. 전액 환불이면 0
     */
    @Transactional
    public void cancel(PaymentSourceType sourceType, String orderId, int remainingTaxableAmountKrw, String reason) {
        receiptRepository.findBySourceTypeAndSourceOrderId(sourceType, orderId).ifPresent(receipt -> {
            // 멱등 — 세무 서비스는 주문 취소 경로와 환불 처리기 양쪽에서 들어온다. 두 번째 호출이
            // AMEND_PENDING 을 CANCELLED 로 덮으면, 대기 중이던 수정 통지가 상태 불일치로 조용히 취소된다.
            if (receipt.getStatus() == PaymentReceipt.Status.CANCELLED
                    || receipt.getStatus() == PaymentReceipt.Status.AMEND_PENDING) {
                return;
            }
            if (!receipt.requiresAmendment()) {
                receipt.markCancelled();
                return;
            }
            receipt.markAmendPending();
            Long receiptId = receipt.getId();
            afterCommitExecutor.execute(() -> issuanceService.amend(receiptId, remainingTaxableAmountKrw, reason));
        });
    }
}
