package com.rich.sodam.service;

import com.rich.sodam.domain.DailySales;
import com.rich.sodam.repository.DailySalesRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 일일 매출 upsert — 같은 날 재입력 시 수정, 음수 거부.
 */
@ExtendWith(MockitoExtension.class)
class DailySalesServiceTest {

    @Mock
    DailySalesRepository repository;
    @InjectMocks
    DailySalesService service;

    @Test
    @DisplayName("해당 날짜 기록이 없으면 새로 생성한다")
    void createsWhenAbsent() {
        LocalDate date = LocalDate.of(2026, 7, 1);
        when(repository.findByStoreIdAndSaleDate(1L, date)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        DailySales saved = service.upsert(1L, date, 350_000L);

        assertThat(saved.getStoreId()).isEqualTo(1L);
        assertThat(saved.getSaleDate()).isEqualTo(date);
        assertThat(saved.getAmount()).isEqualTo(350_000L);
        verify(repository).save(any(DailySales.class));
    }

    @Test
    @DisplayName("같은 날 재입력하면 금액이 수정된다(upsert)")
    void updatesWhenExists() {
        LocalDate date = LocalDate.of(2026, 7, 1);
        DailySales existing = new DailySales(1L, date, 100_000L);
        when(repository.findByStoreIdAndSaleDate(1L, date)).thenReturn(Optional.of(existing));

        DailySales result = service.upsert(1L, date, 420_000L);

        assertThat(result.getAmount()).isEqualTo(420_000L);
        verify(repository, never()).save(any()); // 영속 상태 갱신 — 새 insert 없음
    }

    @Test
    @DisplayName("음수 금액은 거부된다(→ 400)")
    void rejectsNegativeAmount() {
        assertThatThrownBy(() -> service.upsert(1L, LocalDate.now(), -1L))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("0원은 허용된다(휴무 아님·매출 0)")
    void allowsZeroAmount() {
        LocalDate date = LocalDate.of(2026, 7, 1);
        when(repository.findByStoreIdAndSaleDate(1L, date)).thenReturn(Optional.empty());
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));

        assertThat(service.upsert(1L, date, 0L).getAmount()).isZero();
    }

    @Test
    @DisplayName("날짜 누락 시 거부된다")
    void rejectsMissingDate() {
        assertThatThrownBy(() -> service.upsert(1L, null, 1000L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("recent 는 1일 미만 조회를 거부한다")
    void rejectsInvalidDays() {
        assertThatThrownBy(() -> service.recent(1L, 0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
