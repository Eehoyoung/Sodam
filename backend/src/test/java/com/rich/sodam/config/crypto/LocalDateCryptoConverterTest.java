package com.rich.sodam.config.crypto;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class LocalDateCryptoConverterTest {

    private final LocalDateCryptoConverter converter = new LocalDateCryptoConverter();

    @AfterEach
    void clearStaticEncryptionKey() {
        StringCryptoConverter.setKey(null);
    }

    @Test
    void encryptsBirthDateAndRoundTripsIt() {
        StringCryptoConverter.setKey(StringCryptoConverter.buildKey(
                Base64.getDecoder().decode("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")));
        LocalDate birthDate = LocalDate.of(1990, 1, 2);

        String stored = converter.convertToDatabaseColumn(birthDate);

        assertThat(stored).startsWith("enc:v1:").doesNotContain("1990-01-02");
        assertThat(converter.convertToEntityAttribute(stored)).isEqualTo(birthDate);
    }

    @Test
    void readsLegacyPlaintextDateUntilBackfillCompletes() {
        assertThat(converter.convertToEntityAttribute("1990-01-02"))
                .isEqualTo(LocalDate.of(1990, 1, 2));
    }
}
