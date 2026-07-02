package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 주휴 월경계 정합성 알림 (L-NEW-06). 월 경계에 걸친 주(週)는 주휴수당 귀속이 모호해
 * 자동산정이 일부주를 과소반영할 수 있다 — 사장에게 "확인 필요" 플래그.
 *
 * <p>근거: {@code PayrollService} 주석("월 경계 걸친 주·교대 4주평균은 외부 노무사 확인 권장").
 *
 * @param boundaryWeeks 월 경계에 걸친 주 목록
 * @param hasBoundary   경계 주 존재 여부
 * @param advisory      안내·면책
 */
public record PayrollBoundaryAdvisoryResponse(
        int year,
        int month,
        List<BoundaryWeek> boundaryWeeks,
        boolean hasBoundary,
        String advisory
) {
    public record BoundaryWeek(
            LocalDate weekStart,
            LocalDate weekEnd,
            boolean spansPreviousMonth,
            boolean spansNextMonth
    ) {
    }
}
