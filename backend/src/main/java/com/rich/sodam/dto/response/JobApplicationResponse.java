package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * {@code POST /api/job-postings/{postingId}/applications} · {@code GET /api/job-applications/me} 응답
 * — 지원자(직원) 관점(260711_작업통합.md Part 2 §19.3).
 *
 * <p>PII 최소화(security.md) — {@code storeCode}(매장 초대코드)는 {@code status}가 {@code ACCEPTED}일
 * 때만 값이 채워진다(§15와 동일 PII 원칙). {@code status}는 공고 OFF 에 따른 lazy EXPIRED 판정을
 * 반영한 유효 상태다.</p>
 */
public record JobApplicationResponse(
        Long id,
        Long postingId,
        Long storeId,
        String storeName,
        String workType,
        String jobCategory,
        LocalDate workDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer hourlyWage,
        String message,
        String status,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        String storeCode
) {
}
