package com.rich.sodam.core.electronicsignature;

public record ElectronicSignatureVerification(
        ProviderSignatureStatus status,
        VerifiedSignerIdentity signer,
        String signedData) {

    public ElectronicSignatureVerification {
        if (status == null) throw new IllegalArgumentException("전자서명 검증 상태는 필수입니다.");
    }
}
