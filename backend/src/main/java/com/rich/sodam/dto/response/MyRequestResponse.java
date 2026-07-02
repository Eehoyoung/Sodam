package com.rich.sodam.dto.response;

/**
 * 직원이 보낸 요청(정정·휴가)의 통합 현황 한 줄. S3 — 내 요청현황(E-NEW-04).
 *
 * @param type        "correction"(출퇴근 정정) | "timeoff"(휴가)
 * @param id          원본 요청 id
 * @param title       표시 제목
 * @param date        기준 일자(YYYY-MM-DD)
 * @param status      "pending" | "approved" | "rejected"
 * @param reason      신청 사유
 * @param rejectReason 반려 사유(없으면 null)
 */
public record MyRequestResponse(
        String type,
        Long id,
        String title,
        String date,
        String status,
        String reason,
        String rejectReason
) {
}
