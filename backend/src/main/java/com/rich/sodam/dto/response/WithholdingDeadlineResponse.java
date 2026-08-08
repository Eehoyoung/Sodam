package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 원천세 신고기한 안내 (WP-D) — <b>금액 없이 기한·D-day만</b>.
 *
 * <p>{@link WithholdingMonthlyResponse}에서 금액({@code totalWithheld})을 뺀 것이다.
 * 금액 집계는 급여 확정 데이터를 읽어야 하는 유료(PRO) 기능이지만, "익월 10일까지 신고해야 한다"는
 * <b>기한 안내 자체는 알려주는 것만으로 가치가 있고 소담이 잃을 매출이 없다</b>. 그래서 이 응답만
 * FREE 로 개방한다(260807 마스터 실행계획서 WP-D).</p>
 *
 * @param storeId      매장 id
 * @param year         귀속 연도
 * @param month        귀속 월(1~12)
 * @param dueDate      신고·납부 기한(익월 10일)
 * @param daysUntilDue 기한까지 남은 일수(음수면 기한 경과)
 * @param disclaimer   면책(참고용·세무사 검토 전)
 */
public record WithholdingDeadlineResponse(
        Long storeId,
        int year,
        int month,
        LocalDate dueDate,
        long daysUntilDue,
        String disclaimer
) {
}
