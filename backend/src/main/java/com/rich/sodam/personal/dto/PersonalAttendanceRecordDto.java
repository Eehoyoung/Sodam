package com.rich.sodam.personal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 개인 출퇴근 기록 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalAttendanceRecordDto {
    private Long id;
    private Long userId;
    private Long workplaceId; // nullable 가능
    private OffsetDateTime checkInAt;
    private OffsetDateTime checkOutAt; // nullable
    private Integer durationMinutes; // nullable
    private String note; // 최대 500자 권고
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
