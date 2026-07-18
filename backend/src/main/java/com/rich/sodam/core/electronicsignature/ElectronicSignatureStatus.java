package com.rich.sodam.core.electronicsignature;

import java.time.Instant;

public record ElectronicSignatureStatus(
        ProviderSignatureStatus status,
        Instant requestedAt,
        Instant viewedAt,
        Instant completedAt,
        Instant expiresAt) {

    public ElectronicSignatureStatus {
        if (status == null) throw new IllegalArgumentException("전자서명 상태는 필수입니다.");
    }
}
