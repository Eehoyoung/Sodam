package com.rich.sodam.core.electronicsignature;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

final class IdentityNormalizer {
    private static final DateTimeFormatter BIRTHDAY = DateTimeFormatter.BASIC_ISO_DATE;

    private IdentityNormalizer() {
    }

    static String name(String value) {
        String normalized = value == null ? "" : value.replaceAll("\\s+", "");
        if (normalized.isBlank() || normalized.length() > 80) {
            throw new IllegalArgumentException("서명자 성명이 올바르지 않습니다.");
        }
        return normalized;
    }

    static String phone(String value) {
        if (value == null || !value.matches("[0-9\\s-]+")) {
            throw new IllegalArgumentException("서명자 휴대폰번호가 올바르지 않습니다.");
        }
        String normalized = value == null ? "" : value.replaceAll("\\D", "");
        if (!normalized.matches("\\d{10,11}")) {
            throw new IllegalArgumentException("서명자 휴대폰번호가 올바르지 않습니다.");
        }
        return normalized;
    }

    static String birthday(String value) {
        if (value == null || !value.matches("[0-9\\s./-]+")) {
            throw new IllegalArgumentException("서명자 생년월일이 올바르지 않습니다.");
        }
        String normalized = value == null ? "" : value.replaceAll("\\D", "");
        if (!normalized.matches("\\d{8}")) {
            throw new IllegalArgumentException("서명자 생년월일이 올바르지 않습니다.");
        }
        try {
            LocalDate.parse(normalized, BIRTHDAY);
            return normalized;
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("서명자 생년월일이 올바르지 않습니다.");
        }
    }
}
