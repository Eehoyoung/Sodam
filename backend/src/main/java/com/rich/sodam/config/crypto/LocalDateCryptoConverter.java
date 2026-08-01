package com.rich.sodam.config.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * 생년월일처럼 날짜 형식 검증이 필요한 PII를 AES-GCM 문자열 컬럼에 저장한다.
 * 이전 DATE/VARCHAR 값(ISO-8601)은 읽을 수 있고, 이후 저장 시 암호문으로 전환된다.
 */
@Converter
public class LocalDateCryptoConverter implements AttributeConverter<LocalDate, String> {

    private final StringCryptoConverter delegate = new StringCryptoConverter();

    @Override
    public String convertToDatabaseColumn(LocalDate attribute) {
        return attribute == null ? null : delegate.convertToDatabaseColumn(attribute.toString());
    }

    @Override
    public LocalDate convertToEntityAttribute(String dbData) {
        String plain = delegate.convertToEntityAttribute(dbData);
        if (plain == null) {
            return null;
        }
        try {
            return LocalDate.parse(plain);
        } catch (DateTimeParseException e) {
            throw new IllegalStateException("생년월일 PII 데이터 형식이 올바르지 않습니다.", e);
        }
    }
}
