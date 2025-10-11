package com.rich.sodam.service.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * NFC 검증 결과 모델
 */
@Getter
@AllArgsConstructor
public class NfcVerifyResult {
    private final boolean success;
    private final String reason; // INVALID_TAG | PERMISSION | DUPLICATE 등
}
