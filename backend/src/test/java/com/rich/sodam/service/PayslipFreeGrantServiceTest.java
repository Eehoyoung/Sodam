package com.rich.sodam.service;

import com.rich.sodam.domain.PayslipFreeGrant;
import com.rich.sodam.repository.PayslipFreeGrantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 명세서 월1회 무료발급 카운터 (B4) — 첫 발급 무료, 2건째 차단. 키-레디.
 */
class PayslipFreeGrantServiceTest {

    private final PayslipFreeGrantRepository repository = mock(PayslipFreeGrantRepository.class);
    private final PayslipFreeGrantService service = new PayslipFreeGrantService(repository);

    @Test
    @DisplayName("이번 달 첫 발급 → 무료 허용(기록 저장)")
    void firstIsFree() {
        when(repository.existsByStoreIdAndYearMonthKey(1L, "2026-06")).thenReturn(false);
        assertThat(service.tryConsumeFreeGrant(1L, YearMonth.of(2026, 6))).isTrue();
        verify(repository, times(1)).save(any(PayslipFreeGrant.class));
    }

    @Test
    @DisplayName("이미 쓴 달 → 무료 불가(저장 안 함)")
    void secondIsGated() {
        when(repository.existsByStoreIdAndYearMonthKey(eq(1L), eq("2026-06"))).thenReturn(true);
        assertThat(service.tryConsumeFreeGrant(1L, YearMonth.of(2026, 6))).isFalse();
        assertThat(service.hasUsedThisMonth(1L, YearMonth.of(2026, 6))).isTrue();
        verify(repository, never()).save(any());
    }
}
