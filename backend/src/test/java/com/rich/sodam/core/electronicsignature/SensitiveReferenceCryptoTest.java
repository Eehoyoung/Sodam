package com.rich.sodam.core.electronicsignature;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SensitiveReferenceCryptoTest {
    @Test
    void encryptsWithRandomIvAndUsesDeterministicDomainSeparatedHmac() {
        SensitiveReferenceKeySource keySource = configured();
        SensitiveReferenceCrypto crypto = new SensitiveReferenceCrypto(keySource);

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
        SensitiveReferenceKeySource keySource = new SensitiveReferenceKeySource() {
            public String refEncryptionKey() { return ""; }
            public String refHmacPepper() { return ""; }
            public boolean live() { return true; }
        };
        assertThatThrownBy(() -> new SensitiveReferenceCrypto(keySource))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ESIGN_REF_ENCRYPTION_KEY");
    }

    private SensitiveReferenceKeySource configured() {
        String aes = Base64.getEncoder().encodeToString(new byte[32]);
        String hmac = Base64.getEncoder().encodeToString(new byte[32]);
        return new SensitiveReferenceKeySource() {
            public String refEncryptionKey() { return aes; }
            public String refHmacPepper() { return hmac; }
            public boolean live() { return false; }
        };
    }
}
