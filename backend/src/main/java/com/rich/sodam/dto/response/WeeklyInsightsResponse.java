package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 사장용 주간 인사이트 (A6) — 최근 N일 매장 활동 요약. 퍼널 이벤트 집계 기반.
 *
 * @param storeId  매장 id
 * @param fromDate 집계 시작일
 * @param days     집계 일수
 * @param items    이벤트 종류별 카운트
 */
public record WeeklyInsightsResponse(
        Long storeId,
        LocalDate fromDate,
        int days,
        List<InsightItem> items
) {
    public record InsightItem(String eventType, String label, long count) {
    }
}
