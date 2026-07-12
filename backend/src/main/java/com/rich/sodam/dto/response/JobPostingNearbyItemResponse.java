package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * {@code GET /api/job-postings/nearby} 리스트 항목(260711_작업통합.md Part 2 §19.3).
 *
 * <p>직원의 희망지역(§2 #4) 기준 4km 이내 구인중(open=true) 공고. 엔티티 직접 반환 금지 원칙에 따라
 * 이 DTO 로만 응답한다(store PII 없음 — storeName 은 공개 정보).</p>
 *
 * @param distanceMeters 희망지역 2곳 중 매장에 더 가까운 쪽까지의 거리(미터)
 */
public record JobPostingNearbyItemResponse(
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
        long distanceMeters
) {
}
