package com.rich.sodam.dto.response;

/**
 * 거래처별 매입 집계(기간 내). "이번 달 어디에 제일 많이 썼나"에 답한다.
 *
 * @param vendorName    거래처명
 * @param totalAmount   기간 내 합계
 * @param purchaseCount 기간 내 매입 건수
 * @param sharePercent  기간 전체 매입 대비 비중(%)
 */
public record VendorSummaryResponse(
        String vendorName,
        int totalAmount,
        int purchaseCount,
        double sharePercent
) {
}
