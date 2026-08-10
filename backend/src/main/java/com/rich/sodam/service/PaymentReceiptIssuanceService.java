package com.rich.sodam.service;

import com.rich.sodam.config.integration.FiscalReceiptIssuer;
import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.repository.PaymentReceiptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** afterCommit에서 실행하는 외부 발급 전용 서비스. 실패는 결제 커밋을 되돌리지 않고 재시도 상태로 남긴다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentReceiptIssuanceService {
    private final PaymentReceiptRepository receiptRepository;
    private final FiscalReceiptIssuer fiscalReceiptIssuer;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void issue(Long receiptId) {
        PaymentReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null || !receipt.isIssuable()) return;
        try {
            receipt.markIssued(fiscalReceiptIssuer.issue(receipt).reference());
        } catch (RuntimeException e) {
            receipt.markFailed(e.getClass().getSimpleName());
            log.warn("세무 증빙 발급 보류 receiptId={} sourceType={} orderId={}",
                    receiptId, receipt.getSourceType(), receipt.getSourceOrderId());
        }
    }

    /**
     * 발급된 증빙의 수정세금계산서 통지(시행령 §70). 실패해도 환불 자체는 되돌리지 않고
     * {@code AMEND_PENDING} 으로 남긴다 — 다만 <b>미이행 세무 의무</b>이므로 ERROR 로 승격해
     * 사람이 반드시 보게 한다(조용한 재시도만으로는 부족하다).
     *
     * @param remainingTaxableAmountKrw 수정 후 남는 과세표준. 전액 환불이면 0
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void amend(Long receiptId, int remainingTaxableAmountKrw, String reason) {
        PaymentReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null || receipt.getStatus() != PaymentReceipt.Status.AMEND_PENDING) return;
        try {
            receipt.markAmended(
                    fiscalReceiptIssuer.amend(receipt, remainingTaxableAmountKrw, reason).reference());
        } catch (RuntimeException e) {
            receipt.markAmendFailed(e.getClass().getSimpleName());
            log.error("수정세금계산서 통지 실패 — 세무 의무 미이행 상태로 남음, 수동 확인 필요 "
                            + "receiptId={} sourceType={} orderId={}",
                    receiptId, receipt.getSourceType(), receipt.getSourceOrderId(), e);
        }
    }
}
