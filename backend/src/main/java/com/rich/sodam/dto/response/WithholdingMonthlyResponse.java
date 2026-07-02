package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 원천세 월 신고 요약 (B6/T-NEW-04) — 그 달 원천징수세액 합 + 익월 10일 신고기한 안내.
 *
 * <p>합법 라인: <b>요약·기한 안내까지만</b>. 신고·납부는 홈택스 외부링크로 위임(대행 아님).
 * 금액은 그 달 급여({@code Payroll.taxAmount}) 합산 추정 — 실제 신고액은 세무사 검토 후 확정.
 *
 * @param storeId       매장 id
 * @param year          귀속 연도
 * @param month         귀속 월(1~12)
 * @param totalWithheld 그 달 원천징수세액 합(추정)
 * @param dueDate       신고·납부 기한(익월 10일)
 * @param daysUntilDue  기한까지 남은 일수(음수면 기한 경과)
 * @param disclaimer    면책(참고용·세무사 검토 전)
 */
public record WithholdingMonthlyResponse(
        Long storeId,
        int year,
        int month,
        long totalWithheld,
        LocalDate dueDate,
        long daysUntilDue,
        String disclaimer
) {
}
