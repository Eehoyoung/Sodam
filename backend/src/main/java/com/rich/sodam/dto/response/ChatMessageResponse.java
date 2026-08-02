package com.rich.sodam.dto.response;

import java.time.LocalDateTime;

/**
 * {@code POST/GET .../chat-rooms/{roomId}/messages} 응답 항목
 * (recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * @param messageType SYSTEM 이면 {@code senderUserId}/{@code senderName} 은 null
 * @param mine        조회 요청자 본인이 보낸 메시지인지(FE 좌/우 말풍선 배치용) — 시스템 메시지는 항상 false
 * @param masked      전화번호/계좌번호 패턴 감지로 마스킹이 적용됐는지(§4.3 안내 배지 트리거)
 */
public record ChatMessageResponse(
        Long id,
        Long chatRoomId,
        Long senderUserId,
        String senderName,
        String messageType,
        String content,
        boolean masked,
        boolean mine,
        LocalDateTime sentAt,
        LocalDateTime readAt
) {
}
