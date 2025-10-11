package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 위치 사전 검증(Verify) 요청 DTO
 * 매장 ID와 사용자 위치 좌표를 전달합니다.
 */
@Getter
@Setter
@NoArgsConstructor
public class LocationVerifyRequest {

    /**
     * 매장 ID
     */
    @NotNull(message = "매장 ID는 필수입니다.")
    private Long storeId;

    /**
     * 사용자 위도
     */
    @NotNull(message = "위도는 필수입니다.")
    private Double latitude;

    /**
     * 사용자 경도
     */
    @NotNull(message = "경도는 필수입니다.")
    private Double longitude;
}
