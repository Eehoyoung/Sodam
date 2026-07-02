package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 부가가치세 분기 신고기한 안내 (B6/T-NEW-06) — 다가오는 분기 기한 + D-day.
 *
 * <p>금액 산정은 매출 입력이 필요해 <b>기한 알림까지만</b> 한다(매출/POS 미접촉).
 * 일반과세 분기 기준(1·4·7·10월 25일). 간이과세(연 1회 등)는 단순화해 안내만.
 *
 * @param storeId      매장 id
 * @param quarter      안내 대상 신고 분기(예: "2026년 2기 예정")
 * @param dueDate      신고·납부 기한
 * @param daysUntilDue 기한까지 남은 일수
 * @param guidance     안내 문구(과세유형·간이과세 안내 포함)
 * @param disclaimer   면책(참고용·세무사 검토 전)
 */
public record VatDeadlineResponse(
        Long storeId,
        String quarter,
        LocalDate dueDate,
        long daysUntilDue,
        String guidance,
        String disclaimer
) {
}
