package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * {@code GET /api/job-offers/me} · {@code PUT /api/job-offers/{offerId}/respond} 응답
 * (260711_작업통합.md Part 2 §15.3).
 *
 * <p>PII 최소화(security.md) — {@code storeCode}(매장 초대코드)는 {@code status}가 {@code ACCEPTED}일
 * 때만 값이 채워지고, 그 외에는 항상 null이다. 수락 전 응답에 초대코드가 노출되지 않도록 이 필드
 * 하나로 조건부 노출을 표현한다({@code JobOfferService} 가 채운다).</p>
 *
 * @param status    응답 시점 기준 유효 상태(PENDING/ACCEPTED/DECLINED/EXPIRED) — 만료는 lazy 판정 결과
 * @param storeCode 매장 초대코드 — status=ACCEPTED 일 때만 값 존재, 그 외 null
 */
public record JobOfferResponse(
        Long id,
        Long storeId,
        String storeName,
        String workType,
        LocalDate workDate,
        LocalTime startTime,
        LocalTime endTime,
        Integer hourlyWage,
        String message,
        String status,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        LocalDateTime respondedAt,
        String storeCode
) {
}
