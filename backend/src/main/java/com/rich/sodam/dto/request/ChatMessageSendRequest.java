package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /api/chat-rooms/{roomId}/messages} 요청
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * @param content 사용자가 입력한 원문 — 서비스 레이어에서 PII 마스킹을 거친 결과만 저장된다.
 */
public record ChatMessageSendRequest(
        @NotBlank(message = "메시지 내용을 입력해 주세요.")
        @Size(max = 1000, message = "메시지는 1000자 이내로 입력해 주세요.")
        String content
) {
}
