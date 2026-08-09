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
        PaymentReceipt receipt = receiptRepository.findBySourceTypeAndSourceOrderId(sourceType, orderId)
                .orElseGet(() -> receiptRepository.save(PaymentReceipt.create(sourceType, orderId, ownerUserId,
                        paymentKey, amountKrw, properties.getDefaultDocumentType())));
        if (receipt.isIssuable()) {
            afterCommitExecutor.execute(() -> issuanceService.issue(receipt.getId()));
        }
    }

    @Transactional(readOnly = true)
    public List<PaymentReceipt> myReceipts(Long ownerUserId) {
        return receiptRepository.findByOwnerUserIdOrderByCreatedAtDesc(ownerUserId);
    }
}
