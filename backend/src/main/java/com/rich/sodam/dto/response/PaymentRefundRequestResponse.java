package com.rich.sodam.dto.response;

import com.rich.sodam.domain.PaymentRefundRequest;
import com.rich.sodam.domain.type.PaymentSourceType;
import java.time.LocalDateTime;

public record PaymentRefundRequestResponse(Long id, PaymentSourceType sourceType, String orderId,
                                           int amountKrw, PaymentRefundRequest.Status status,
                                           String failureReason, LocalDateTime createdAt, LocalDateTime completedAt) {
    public static PaymentRefundRequestResponse from(PaymentRefundRequest request) {
        return new PaymentRefundRequestResponse(request.getId(), request.getSourceType(), request.getSourceOrderId(),
                request.getAmountKrw(), request.getStatus(), request.getFailureReason(), request.getCreatedAt(), request.getCompletedAt());
    }
}
