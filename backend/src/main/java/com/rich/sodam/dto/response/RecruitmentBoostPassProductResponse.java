package com.rich.sodam.dto.response;

import com.rich.sodam.config.RecruitmentBoostPassProperties;
import com.rich.sodam.domain.type.RecruitmentBoostPassProductCode;

/**
 * 무제한 패스 상품 1건 — {@code GET /api/recruitment-boost-passes/me} 응답의 상품 목록 항목.
 *
 * @param code         상품 코드(THREE_DAY/SEVEN_DAY/THIRTY_DAY)
 * @param displayName  표시명
 * @param durationDays 기간(일) — 설정값 스냅샷
 * @param priceKrw     가격(원) — 설정값 스냅샷(미확정, 운영 중 조정 가능)
 */
public record RecruitmentBoostPassProductResponse(
        RecruitmentBoostPassProductCode code,
        String displayName,
        int durationDays,
        int priceKrw
) {
    public static RecruitmentBoostPassProductResponse from(RecruitmentBoostPassProperties.ProductQuote quote) {
        return new RecruitmentBoostPassProductResponse(
                quote.code(), quote.code().getDisplayName(), quote.durationDays(), quote.priceKrw());
    }
}
