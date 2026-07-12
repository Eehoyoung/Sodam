package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * {@code PUT/GET /api/stores/{storeId}/job-posting} 응답 — 사장 본인 공고 조회/저장 결과
 * (260711_작업통합.md Part 2 §19.3).
 */
public record JobPostingResponse(
        Long id,
        Long storeId,
        String storeName,
        String workType,
        String jobCategory,
        LocalDate workDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer hourlyWage,
        String message,
        boolean open,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
