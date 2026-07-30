package com.rich.sodam.config.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Encrypts sensitive integer values using the same AES-GCM key and legacy plaintext fallback as StringCryptoConverter. */
@Converter
public class IntegerCryptoConverter implements AttributeConverter<Integer, String> {

    private final StringCryptoConverter delegate = new StringCryptoConverter();

    @Override
    public String convertToDatabaseColumn(Integer attribute) {
        return attribute == null ? null : delegate.convertToDatabaseColumn(attribute.toString());
    }

    @Override
    public Integer convertToEntityAttribute(String dbData) {
        String value = delegate.convertToEntityAttribute(dbData);
        return value == null ? null : Integer.valueOf(value);
    }
}
