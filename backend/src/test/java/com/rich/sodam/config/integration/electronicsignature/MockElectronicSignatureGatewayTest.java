package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.config.integration.IntegrationProperties;
import com.rich.sodam.core.electronicsignature.DeviceOs;
import com.rich.sodam.core.electronicsignature.DocumentDigest;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureReceipt;
import com.rich.sodam.core.electronicsignature.ElectronicSignatureRequest;
import com.rich.sodam.core.electronicsignature.ProviderSignatureStatus;
import com.rich.sodam.core.electronicsignature.SignerIdentity;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MockElectronicSignatureGatewayTest {
    private static final Instant NOW = Instant.parse("2026-07-17T00:00:00Z");

    @Test
    void completesAndVerifiesWithoutExposingIdentityInSignedData() {
        MockElectronicSignatureGateway gateway = gateway("naver", "sodam");
        ElectronicSignatureReceipt receipt = gateway.request(request("sodam://signature/done"));

        assertThat(gateway.getStatus(receipt.receiptId()).status())
                .isEqualTo(ProviderSignatureStatus.COMPLETED);
        var verification = gateway.verify(receipt.receiptId());
        assertThat(verification.status()).isEqualTo(ProviderSignatureStatus.COMPLETED);
        assertThat(verification.signer().phone()).isEqualTo("01012345678");
        assertThat(verification.signedData()).doesNotContain("01012345678", "홍길동");
    }

    @Test
    void rejectsReturnSchemeOutsideAllowlist() {
        MockElectronicSignatureGateway gateway = gateway("naver", "sodam");

        assertThatThrownBy(() -> gateway.request(request("evil-app://signature/done")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("허용되지 않은");
    }

    private MockElectronicSignatureGateway gateway(String provider, String scheme) {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getElectronicSignature().setProvider(provider);
        properties.getElectronicSignature().setAllowedReturnScheme(scheme);
        return new MockElectronicSignatureGateway(
                properties, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private ElectronicSignatureRequest request(String returnUrl) {
        return new ElectronicSignatureRequest(
                ElectronicSignatureProvider.NAVER,
                new SignerIdentity("홍길동", "010-1234-5678", "1990-01-02"),
                DocumentDigest.sha256("final-pdf".getBytes()),
                "근로계약서 서명",
                "계약 내용을 확인하고 서명해 주세요.",
                "0212345678",
                300,
                true,
                DeviceOs.ANDROID,
                returnUrl);
    }
}
