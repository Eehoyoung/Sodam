package com.rich.sodam.dto.response;

/**
 * {@code GET /api/stores/{storeId}/job-applications} 리스트 항목 · {@code PUT .../respond} 응답
 * — 사장(매장) 관점 지원자 카드(260711_작업통합.md Part 2 §19.1 "구직자 카드와 동일 정보 구성").
 *
 * <p>PII 최소화(security.md) — phone/email/생년월일 원문은 포함하지 않는다. {@code age} 만
 * birthDate 기반으로 파생 계산해 노출한다.</p>
 */
public record JobApplicantListItemResponse(
        Long applicationId,
        Long applicantUserId,
        String applicantName,
        Integer age,
        JobSeekingProfileResponse.CurrentEmployment currentEmployment,
        String message,
        String status,
        java.time.LocalDateTime createdAt,
        java.time.LocalDateTime respondedAt
) {
}
