package com.rich.sodam.dto.response;

import com.rich.sodam.config.AttendanceCreditProperties;
import com.rich.sodam.domain.type.AttendanceCreditChargePackCode;

/**
 * 출근권 충전소 상품 1건 — {@code GET /api/attendance-credits/charge/packs} 카탈로그 항목.
 *
 * @param code           상품 코드(SMALL/MEDIUM/LARGE/STREAK_RECOVERY)
 * @param displayName    표시명
 * @param creditQuantity 지급 출근권 수량(재화, 스트릭 복구권은 0)
 * @param ticketQuantity 지급 티켓 수량(스트릭 복구권만 1)
 * @param priceKrw       가격(원) — 설정값 스냅샷(미확정, 운영 중 조정 가능)
 * @param popular        "가장 인기" 배지 표시 여부
 */
public record AttendanceCreditChargePackResponse(
        AttendanceCreditChargePackCode code,
        String displayName,
        int creditQuantity,
        int ticketQuantity,
        int priceKrw,
        boolean popular
) {
    public static AttendanceCreditChargePackResponse from(AttendanceCreditProperties.PackQuote quote) {
        return new AttendanceCreditChargePackResponse(
                quote.code(), quote.code().getDisplayName(), quote.creditQuantity(), quote.ticketQuantity(),
                quote.priceKrw(), quote.code().isPopularBadge());
    }
}
