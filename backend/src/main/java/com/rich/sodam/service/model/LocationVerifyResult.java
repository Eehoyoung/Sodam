package com.rich.sodam.service.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 위치 검증 결과 모델
 */
@Getter
@AllArgsConstructor
public class LocationVerifyResult {
    private final boolean success;
    private final Double distance; // 미터
    private final String reason;   // OUT_OF_RANGE | PERMISSION 등
}
