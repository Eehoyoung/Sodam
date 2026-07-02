package com.rich.sodam.dto.response;

import java.util.List;

/**
 * 통합고용세액공제 상시근로자 월별 증빙 (A3/T-NEW-02).
 *
 * <p>출근 데이터로 월별 상시근로자 수를 집계하고 전년 대비 증감을 본다. 직원을 늘린
 * 사장의 절세(고용 증가 공제) 신호. <b>추정·참고용</b> — 실제 공제는 세무사 검토 필요.
 *
 * @param monthly              월별(1~12) 상시근로자 수
 * @param averageHeadcount     해당 연도 평균(상시근로자 수 추정)
 * @param priorYearAverage     전년 평균
 * @param increasedVsPriorYear 전년 대비 증가 여부(공제 가능 신호)
 * @param disclaimer           면책
 */
public record HeadcountTrendResponse(
        Long storeId,
        int year,
        List<MonthCount> monthly,
        double averageHeadcount,
        double priorYearAverage,
        boolean increasedVsPriorYear,
        String disclaimer
) {
    public record MonthCount(int month, int headcount) {
    }
}
