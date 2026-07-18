package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ElectronicSignatureProviderPolicyTest {

    @Test
    void exposesGuideSpecificLimits() {
        assertThat(ElectronicSignatureProvider.NAVER.policy().maxExpirySeconds()).isEqualTo(1000);
        assertThat(ElectronicSignatureProvider.NAVER.policy().maxVerificationAttempts()).isEqualTo(1);
        assertThat(ElectronicSignatureProvider.KAKAO.policy().verificationWindow()).contains(Duration.ofMinutes(10));
        assertThat(ElectronicSignatureProvider.TOSS.policy().maxExpirySeconds()).isEqualTo(1800);
        assertThat(ElectronicSignatureProvider.TOSS.policy().maxVerificationAttempts()).isEqualTo(2);
    }

    @Test
    void validatesProviderSpecificRequestFields() {
        SignerIdentity signer = new SignerIdentity("홍 길동", "010-1234-5678", "19900102");
        DocumentDigest digest = DocumentDigest.sha256(new byte[]{1, 2, 3});

        ElectronicSignatureRequest valid = new ElectronicSignatureRequest(
                ElectronicSignatureProvider.NAVER, signer, digest,
                "근로계약서 서명", "문서를 확인하고 서명해 주세요.", "1600-0000",
                300, false, null, null);

        assertThat(valid.signer().phone()).isEqualTo("01012345678");

        assertThatThrownBy(() -> new ElectronicSignatureRequest(
                ElectronicSignatureProvider.NAVER, signer, digest,
                "근로계약서 서명", "문서", "1600-0000",
                1001, false, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("만료");
    }

    @Test
    void appToAppRequiresSafeCustomScheme() {
        SignerIdentity signer = new SignerIdentity("홍길동", "01012345678", "19900102");
        DocumentDigest digest = DocumentDigest.sha256(new byte[]{1});

        assertThatThrownBy(() -> new ElectronicSignatureRequest(
                ElectronicSignatureProvider.KAKAO, signer, digest,
                "서명", null, null, 300, true, null, "https://evil.example/callback"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("앱 스킴");
    }
}
