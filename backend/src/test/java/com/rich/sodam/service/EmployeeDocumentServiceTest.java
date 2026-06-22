package com.rich.sodam.service;

import com.rich.sodam.domain.EmployeeDocument;
import com.rich.sodam.domain.type.DocumentType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 직원 서류 만료 판정 (A5) — OK/EXPIRING/EXPIRED 경계.
 */
class EmployeeDocumentServiceTest {

    private EmployeeDocument doc(LocalDate expiresAt) {
        return EmployeeDocument.create(1L, 1L, DocumentType.HEALTH_CERTIFICATE, "보건증",
                null, LocalDate.of(2026, 1, 1), expiresAt);
    }

    @Test
    @DisplayName("만료일 없으면 OK + 남은일수 null")
    void noExpiry() {
        EmployeeDocument d = doc(null);
        LocalDate today = LocalDate.of(2026, 6, 16);
        assertThat(d.daysUntilExpiry(today)).isNull();
        assertThat(d.expiryStatus(today, 30)).isEqualTo("OK");
    }

    @Test
    @DisplayName("30일 임계: 이내 EXPIRING, 초과 OK")
    void expiringThreshold() {
        LocalDate today = LocalDate.of(2026, 6, 16);
        assertThat(doc(today.plusDays(7)).expiryStatus(today, 30)).isEqualTo("EXPIRING");
        assertThat(doc(today.plusDays(30)).expiryStatus(today, 30)).isEqualTo("EXPIRING");
        assertThat(doc(today.plusDays(31)).expiryStatus(today, 30)).isEqualTo("OK");
    }

    @Test
    @DisplayName("만료일 지나면 EXPIRED + 음수 남은일수")
    void expired() {
        LocalDate today = LocalDate.of(2026, 6, 16);
        EmployeeDocument d = doc(today.minusDays(3));
        assertThat(d.expiryStatus(today, 30)).isEqualTo("EXPIRED");
        assertThat(d.daysUntilExpiry(today)).isEqualTo(-3);
    }
}
