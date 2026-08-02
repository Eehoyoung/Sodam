package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * {@code GET /api/chat-rooms/me} 응답 항목(§4.1 컨텍스트 핀 요약).
 *
 * @param counterpartUserId 조회 요청자 기준 상대방(사장이면 지원자/구직자, 구직자면 사장)
 * @param status            {@code ACTIVE}/{@code READ_ONLY}(§4.6, 조회 시점 lazy 판정 결과)
 */
public record ChatRoomListItemResponse(
        Long id,
        Long storeId,
        String storeName,
        Long counterpartUserId,
        String counterpartName,
        String workType,
        LocalDate workDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer hourlyWage,
        String status,
        String lastMessagePreview,
        LocalDateTime lastMessageAt,
        long unreadCount,
        LocalDateTime matchedAt
) {
}
