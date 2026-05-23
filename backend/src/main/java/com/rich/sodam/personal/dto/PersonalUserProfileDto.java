package com.rich.sodam.personal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 개인 사용자 프로필 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalUserProfileDto {
    private Long userId;
    private String nickname;
    private Integer defaultHourlyWage; // null 허용, 기본 0 처리
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
