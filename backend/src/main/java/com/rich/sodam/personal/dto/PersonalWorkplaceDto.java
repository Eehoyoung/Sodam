package com.rich.sodam.personal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 개인 근무지 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalWorkplaceDto {
    private Long id;
    private Long userId;
    private String name;
    private String address;
    private Integer hourlyWage;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
