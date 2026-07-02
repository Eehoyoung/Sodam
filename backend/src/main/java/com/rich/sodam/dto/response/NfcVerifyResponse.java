package com.rich.sodam.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * NFC 사전 검증(Verify) 응답 DTO
 */
@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NfcVerifyResponse {
    /**
     * 검증 성공 여부
     */
    private final boolean success;
    /**
     * 실패 사유 코드 (INVALID_TAG | PERMISSION | DUPLICATE 등)
     */
    private final String reason;
}
