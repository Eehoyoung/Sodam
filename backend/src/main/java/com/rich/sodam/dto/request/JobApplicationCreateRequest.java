package com.rich.sodam.dto.request;

import jakarta.validation.constraints.Size;

/**
 * {@code POST /api/job-postings/{postingId}/applications} 요청(260711_작업통합.md Part 2 §19.3).
 *
 * @param message 지원 메시지(선택, 200자 이내)
 */
public record JobApplicationCreateRequest(
        @Size(max = 200, message = "메시지는 200자 이내로 입력해 주세요.") String message
) {
}
