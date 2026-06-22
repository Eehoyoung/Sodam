package com.rich.sodam.dto.response;

import java.time.LocalDate;

/**
 * 발주 참고 — 품목별 매입 주기·최근 수량. <b>재고 자동차감이 아닌 참고용</b>(스코프 라인).
 *
 * @param itemName        품목 표시명
 * @param unit            대표 단위
 * @param purchaseCount   기간 내 매입 횟수
 * @param avgIntervalDays 평균 매입 간격(일) — 1회뿐이면 null
 * @param lastPurchaseDate 마지막 매입일
 * @param lastQuantity    마지막 매입 수량
 */
public record ReorderHintResponse(
        String itemName,
        String unit,
        int purchaseCount,
        Double avgIntervalDays,
        LocalDate lastPurchaseDate,
        double lastQuantity
) {
}
