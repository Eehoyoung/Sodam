package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.util.List;

/**
 * 품목별 단가 가격비교. 같은 품목의 시점·거래처별 단가 추이.
 *
 * <p>스코프: 매입 단가의 "비교"까지만. 원가율·마진(POS)은 계산하지 않는다.
 *
 * @param itemName         품목 표시명
 * @param unit             대표 단위
 * @param currentUnitPrice 최근 매입 단가
 * @param previousUnitPrice 직전 매입 단가(없으면 null)
 * @param changeRatePercent 직전 대비 변동률(%) — 소수 1자리, 직전 없으면 null
 * @param cheapestVendor   기간 내 최저 단가 거래처
 * @param cheapestUnitPrice 최저 단가
 * @param points           시계열 포인트(오름차순)
 */
public record PriceTrendResponse(
        String itemName,
        String unit,
        Integer currentUnitPrice,
        Integer previousUnitPrice,
        Double changeRatePercent,
        String cheapestVendor,
        Integer cheapestUnitPrice,
        List<Point> points
) {
    public record Point(LocalDate date, String vendorName, int unitPrice, double quantity, String unit) {
    }
}
