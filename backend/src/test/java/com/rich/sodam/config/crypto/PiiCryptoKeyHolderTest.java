package com.rich.sodam.config.crypto;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PiiCryptoKeyHolderTest {

    @AfterEach
    void clearStaticEncryptionKey() {
        StringCryptoConverter.setKey(null);
    }

    @Test
    void prodRejectsPredictableNonBase64EncryptionKey() {
        PiiCryptoKeyHolder holder = new PiiCryptoKeyHolder(prodEnvironment());
        ReflectionTestUtils.setField(holder, "encryptionKey", "change-me");

        assertThatThrownBy(holder::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32바이트 Base64");
        assertThat(StringCryptoConverter.isEncryptionEnabled()).isFalse();
    }

    @Test
    void prodAcceptsExactly32ByteBase64EncryptionKey() {
        PiiCryptoKeyHolder holder = new PiiCryptoKeyHolder(prodEnvironment());
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        ReflectionTestUtils.setField(holder, "encryptionKey", key);

        holder.init();

        String encrypted = new StringCryptoConverter().convertToDatabaseColumn("sensitive-value");
        assertThat(encrypted).startsWith("enc:v1:").doesNotContain("sensitive-value");
    }

    private MockEnvironment prodEnvironment() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        return environment;
    }
}
