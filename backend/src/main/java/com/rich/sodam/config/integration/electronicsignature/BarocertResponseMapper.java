package com.rich.sodam.config.integration.electronicsignature;

import com.rich.sodam.core.electronicsignature.ElectronicSignatureProvider;
import com.rich.sodam.core.electronicsignature.ProviderSignatureStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

final class BarocertResponseMapper {
    private static final DateTimeFormatter BAROCERT_DATE_TIME =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private BarocertResponseMapper() {
    }

    static ProviderSignatureStatus status(ElectronicSignatureProvider provider, int state) {
        return switch (state) {
            case 0 -> ProviderSignatureStatus.PENDING;
            case 1 -> ProviderSignatureStatus.COMPLETED;
            case 2 -> ProviderSignatureStatus.EXPIRED;
            case 3 -> provider == ElectronicSignatureProvider.NAVER
                    ? ProviderSignatureStatus.DECLINED
                    : ProviderSignatureStatus.FAILED;
            default -> ProviderSignatureStatus.FAILED;
        };
    }

    static ProviderSignatureStatus tossVerificationStatus(String state) {
        if (state == null || state.isBlank()) return ProviderSignatureStatus.FAILED;
        String normalized = state.trim().toUpperCase(Locale.ROOT);
        try {
            return status(ElectronicSignatureProvider.TOSS, Integer.parseInt(normalized));
        } catch (NumberFormatException ignored) {
            return switch (normalized) {
                case "COMPLETED", "COMPLETE", "SUCCESS", "SIGNED" ->
                        ProviderSignatureStatus.COMPLETED;
                case "PENDING" -> ProviderSignatureStatus.PENDING;
                case "EXPIRED" -> ProviderSignatureStatus.EXPIRED;
                case "DECLINED", "REJECTED" -> ProviderSignatureStatus.DECLINED;
                default -> ProviderSignatureStatus.FAILED;
            };
        }
    }

    static Instant instant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDateTime.parse(value.trim(), BAROCERT_DATE_TIME)
                    .atZone(KOREA)
                    .toInstant();
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }
}
