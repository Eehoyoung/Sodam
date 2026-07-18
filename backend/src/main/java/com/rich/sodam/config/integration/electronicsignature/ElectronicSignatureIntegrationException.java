package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;

/** 공급자 오류 원문이나 서명자 개인정보를 노출하지 않는 전자서명 연동 예외. */
public final class ElectronicSignatureIntegrationException extends RuntimeException {
    private final ElectronicSignatureProvider provider;
    private final long providerCode;

    public ElectronicSignatureIntegrationException(
            ElectronicSignatureProvider provider, long providerCode) {
        super("전자서명 공급자 처리에 실패했습니다.");
        this.provider = provider;
        this.providerCode = providerCode;
    }

    public ElectronicSignatureProvider provider() {
        return provider;
    }

    public long providerCode() {
        return providerCode;
    }
}
