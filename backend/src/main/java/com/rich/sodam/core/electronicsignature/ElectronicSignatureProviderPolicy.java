package com.rich.sodam.core.electronicsignature;

import java.time.Duration;
import java.util.Optional;

/** docs/가이드와 BaroCert 공급자 정책의 공통 제약. */
public record ElectronicSignatureProviderPolicy(
        int maxExpirySeconds,
        int maxVerificationAttempts,
        Optional<Duration> verificationWindow,
        boolean messageRequired,
        boolean messageSupported,
        boolean callCenterRequired,
        boolean deviceOsRequiredForAppToApp) {

    public ElectronicSignatureProviderPolicy {
        verificationWindow = verificationWindow == null ? Optional.empty() : verificationWindow;
        if (maxExpirySeconds < 1 || maxVerificationAttempts < 1) {
            throw new IllegalArgumentException("공급자 정책 값이 올바르지 않습니다.");
        }
    }
}
