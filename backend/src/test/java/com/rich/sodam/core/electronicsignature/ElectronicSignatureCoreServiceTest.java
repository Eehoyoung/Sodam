package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class ElectronicSignatureCoreServiceTest {
    private static final Instant NOW = Instant.parse("2026-07-17T00:00:00Z");

    @Test
    void coordinatesRequestStatusAndIdentityCheckedVerification() {
        SignerIdentity signer = new SignerIdentity("홍길동", "01012345678", "19900102");
        ElectronicSignatureGateway gateway = new ElectronicSignatureGateway() {
            @Override
            public ElectronicSignatureProvider provider() {
                return ElectronicSignatureProvider.NAVER;
            }

            @Override
            public ElectronicSignatureReceipt request(ElectronicSignatureRequest request) {
                return new ElectronicSignatureReceipt("receipt", null, null);
            }

            @Override
            public ElectronicSignatureStatus getStatus(String receiptId) {
                return new ElectronicSignatureStatus(
                        ProviderSignatureStatus.COMPLETED, null, null, null, NOW.plusSeconds(300));
            }

            @Override
            public ElectronicSignatureVerification verify(String receiptId) {
                return new ElectronicSignatureVerification(
                        ProviderSignatureStatus.COMPLETED,
                        new VerifiedSignerIdentity("홍길동", "01012345678", "19900102"),
                        "signed-data");
            }
        };
        ElectronicSignatureCoreService core = new ElectronicSignatureCoreService(
                gateway, Clock.fixed(NOW, ZoneOffset.UTC));

        ElectronicSignatureProcess process = core.request(new ElectronicSignatureRequest(
                ElectronicSignatureProvider.NAVER,
                signer,
                DocumentDigest.sha256("pdf".getBytes()),
                "근로계약서 서명",
                "계약 내용을 확인해 주세요.",
                "0212345678",
                300,
                false,
                null,
                null));
        core.refresh(process);
        VerificationDecision decision = core.verify(process);

        assertThat(decision.accepted()).isTrue();
        assertThat(process.status()).isEqualTo(ElectronicSignatureProcessStatus.VERIFIED);
        assertThat(process.verificationAttempts()).isEqualTo(1);
    }
}
