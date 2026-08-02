package com.rich.sodam.dto.response;

import com.rich.sodam.service.RecruitmentBoostPassService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * {@code GET /api/recruitment-boost-passes/me} 응답 전체.
 *
 * @param active        지금 시점 활성 무제한 패스 보유 여부
 * @param activeUntil   활성인 경우 만료 시각(비활성이면 null)
 * @param remainingDays 활성인 경우 남은 일수(D-day, 올림 계산 — 비활성이면 0)
 * @param products      상품 목록(3/7/30일권)
 */
public record RecruitmentBoostPassSummaryResponse(
        boolean active,
        LocalDateTime activeUntil,
        int remainingDays,
        List<RecruitmentBoostPassProductResponse> products
) {
    public static RecruitmentBoostPassSummaryResponse from(RecruitmentBoostPassService.Summary summary) {
        return new RecruitmentBoostPassSummaryResponse(
                summary.active(),
                summary.activeUntil(),
                summary.remainingDays(),
                summary.products().stream().map(RecruitmentBoostPassProductResponse::from).toList()
        );
    }
}
