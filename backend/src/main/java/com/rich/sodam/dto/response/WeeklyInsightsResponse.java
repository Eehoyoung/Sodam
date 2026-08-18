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
 * @param summary  LLM 요약 문장(WP-2, {@code docs/260817} goal) — provider 미설정/실패 시 null.
 *                 FE는 null이면 기존 숫자 나열형으로 표시한다.
 */
public record WeeklyInsightsResponse(
        Long storeId,
        LocalDate fromDate,
        int days,
        List<InsightItem> items,
        String summary
) {
    public record InsightItem(String eventType, String label, long count) {
    }
}
