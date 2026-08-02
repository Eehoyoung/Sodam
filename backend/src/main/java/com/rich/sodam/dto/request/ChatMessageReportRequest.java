package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * {@code POST /api/chat-messages/{messageId}/reports} 요청(§4.4).
 *
 * @param reason {@code SPAM}/{@code INAPPROPRIATE_LANGUAGE}/{@code FRAUD_SUSPECTED}
 *               ({@link com.rich.sodam.domain.type.ChatReportReason})
 */
public record ChatMessageReportRequest(
        @NotBlank(message = "신고 사유를 선택해 주세요.")
        String reason
) {
}
