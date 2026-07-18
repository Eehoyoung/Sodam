package com.rich.sodam.core.electronicsignature;

import java.time.Duration;
import java.util.Optional;

public enum ElectronicSignatureProvider {
    NAVER(new ElectronicSignatureProviderPolicy(1000, 1, Optional.empty(), true, true, true, true)),
    KAKAO(new ElectronicSignatureProviderPolicy(1000, 1, Optional.of(Duration.ofMinutes(10)), false, true, false, false)),
    TOSS(new ElectronicSignatureProviderPolicy(1800, 2, Optional.empty(), false, false, false, true));

    private final ElectronicSignatureProviderPolicy policy;

    ElectronicSignatureProvider(ElectronicSignatureProviderPolicy policy) {
        this.policy = policy;
    }

    public ElectronicSignatureProviderPolicy policy() {
        return policy;
    }

    public static ElectronicSignatureProvider parse(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("전자서명 공급자가 비어 있습니다.");
        }
        try {
            return valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("지원하지 않는 전자서명 공급자입니다.");
        }
    }
}
