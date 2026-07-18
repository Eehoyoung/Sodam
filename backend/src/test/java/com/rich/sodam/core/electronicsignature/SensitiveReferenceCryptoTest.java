package com.rich.sodam.core.electronicsignature;

import com.rich.sodam.config.integration.IntegrationProperties;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SensitiveReferenceCryptoTest {
    @Test
    void encryptsWithRandomIvAndUsesDeterministicDomainSeparatedHmac() {
        IntegrationProperties properties = configured("mock");
        SensitiveReferenceCrypto crypto = new SensitiveReferenceCrypto(properties);

        String first = crypto.encrypt("esign/private/object-1");
        String second = crypto.encrypt("esign/private/object-1");

        assertThat(first).startsWith("v1.k1.").isNotEqualTo(second).doesNotContain("object-1");
        assertThat(crypto.decrypt(first)).isEqualTo("esign/private/object-1");
        assertThat(crypto.receiptHmac(ElectronicSignatureProvider.NAVER, "receipt-1"))
                .hasSize(64)
                .isEqualTo(crypto.receiptHmac(ElectronicSignatureProvider.NAVER, "receipt-1"))
                .isNotEqualTo(crypto.receiptHmac(ElectronicSignatureProvider.TOSS, "receipt-1"));
    }

    @Test
    void liveModeFailsWithoutDedicatedKeys() {
        IntegrationProperties properties = new IntegrationProperties();
        properties.getElectronicSignature().setMode("live");
        assertThatThrownBy(() -> new SensitiveReferenceCrypto(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ESIGN_REF_ENCRYPTION_KEY");
    }

    private IntegrationProperties configured(String mode) {
        IntegrationProperties p = new IntegrationProperties();
        p.getElectronicSignature().setMode(mode);
        p.getElectronicSignature().setRefEncryptionKey(
                Base64.getEncoder().encodeToString(new byte[32]));
        p.getElectronicSignature().setRefHmacPepper(
                Base64.getEncoder().encodeToString(new byte[32]));
        return p;
    }
}
