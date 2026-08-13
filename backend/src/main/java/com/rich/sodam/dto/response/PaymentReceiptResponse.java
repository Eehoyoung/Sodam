package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PaymentReceipt;
import com.rich.sodam.domain.type.FiscalDocumentType;
import com.rich.sodam.domain.type.PaymentSourceType;
import java.time.LocalDateTime;

public record PaymentReceiptResponse(Long id, PaymentSourceType sourceType, String orderId, int amountKrw,
                                     FiscalDocumentType documentType, PaymentReceipt.Status status,
                                     String issuerReference, LocalDateTime createdAt, LocalDateTime issuedAt) {
    public static PaymentReceiptResponse from(PaymentReceipt receipt) {
        return new PaymentReceiptResponse(receipt.getId(), receipt.getSourceType(), receipt.getSourceOrderId(),
                receipt.getAmountKrw(), receipt.getDocumentType(), receipt.getStatus(), receipt.getIssuerReference(),
                receipt.getCreatedAt(), receipt.getIssuedAt());
    }
}
