package com.rich.sodam.dto.response;

import com.rich.sodam.domain.AttendanceNotice;
import com.rich.sodam.domain.type.AttendanceNoticeType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceNoticeResponse(
        Long id,
        Long storeId,
        LocalDate forDate,
        AttendanceNoticeType type,
        String message,
        LocalDateTime createdAt
) {
    public static AttendanceNoticeResponse of(AttendanceNotice n) {
        return new AttendanceNoticeResponse(n.getId(), n.getStoreId(), n.getForDate(), n.getType(),
                n.getMessage(), n.getCreatedAt());
    }
}
