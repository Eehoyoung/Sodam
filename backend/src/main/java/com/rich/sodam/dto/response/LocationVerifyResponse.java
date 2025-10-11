package com.rich.sodam.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 위치 사전 검증(Verify) 응답 DTO
 * success, reason, distance(미터)를 포함합니다.
 */
@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LocationVerifyResponse {
    /**
     * 검증 성공 여부
     */
    private final boolean success;
    /**
     * 실패 사유 코드 (OUT_OF_RANGE | PERMISSION 등)
     */
    private final String reason;
    /**
     * 매장 중심과 사용자 위치 간 거리(미터)
     */
    private final Double distance;
}
