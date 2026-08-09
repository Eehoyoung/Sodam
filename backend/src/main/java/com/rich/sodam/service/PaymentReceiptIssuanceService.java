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
}
