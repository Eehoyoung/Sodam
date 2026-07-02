package com.rich.sodam.service;

import com.rich.sodam.dto.response.PayrollBoundaryAdvisoryResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 주휴 월경계 정합성 알림 (L-NEW-06) — 경계 주 식별.
 */
class PayrollAdvisoryServiceTest {

    private final PayrollAdvisoryService service = new PayrollAdvisoryService();

    @Test
    @DisplayName("2026-06: 1일(월)~30일(화) → 마지막 주가 다음달로 넘어감")
    void june2026() {
        // 2026-06-01은 월요일 → 첫 주 경계 없음. 06-30은 화요일 → 말일 주가 7월로 넘어감.
        PayrollBoundaryAdvisoryResponse res = service.monthBoundaryWeeks(2026, 6);
        assertThat(res.hasBoundary()).isTrue();
        assertThat(res.boundaryWeeks()).anyMatch(PayrollBoundaryAdvisoryResponse.BoundaryWeek::spansNextMonth);
        assertThat(res.advisory()).contains("노무사");
    }

    @Test
    @DisplayName("첫날이 월요일이 아니면 첫 주가 전월에 걸침")
    void firstWeekSpansPrev() {
        // 2026-05-01은 금요일 → 첫 주가 4월(월~목)에 걸침
        PayrollBoundaryAdvisoryResponse res = service.monthBoundaryWeeks(2026, 5);
        assertThat(res.boundaryWeeks()).anyMatch(PayrollBoundaryAdvisoryResponse.BoundaryWeek::spansPreviousMonth);
    }

    @Test
    @DisplayName("경계 주는 최대 2개(첫·말일 주)")
    void atMostTwo() {
        PayrollBoundaryAdvisoryResponse res = service.monthBoundaryWeeks(2026, 5);
        assertThat(res.boundaryWeeks().size()).isLessThanOrEqualTo(2);
    }
}
