package com.rich.sodam.dto.response;

/**
 * 최근 N개월 매입 합계 추이의 한 점. 매입이 없는 달도 0원으로 채워 그래프가 끊기지 않게 한다.
 *
 * @param yearMonth   'YYYY-MM'
 * @param totalAmount 해당 월 매입 합계
 */
public record MonthlySummaryResponse(String yearMonth, int totalAmount) {
}
