package com.rich.sodam.repository;

import com.rich.sodam.domain.DailySales;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 일일 매출 (storeId, saleDate) 유니크 제약 + 기간 조회 — H2 통합 검증.
 */
@DataJpaTest
@ActiveProfiles("test")
class DailySalesRepositoryTest {

    @Autowired
    private DailySalesRepository dailySalesRepository;

    @Test
    @DisplayName("(storeId, saleDate) 중복 저장은 유니크 제약 위반")
    void uniqueConstraintOnStoreAndDate() {
        LocalDate date = LocalDate.of(2026, 7, 1);
        dailySalesRepository.saveAndFlush(new DailySales(1L, date, 100_000L));

        assertThatThrownBy(() ->
                dailySalesRepository.saveAndFlush(new DailySales(1L, date, 200_000L)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("기간 조회는 미입력 날짜 없이 입력 건만 날짜 오름차순으로 반환")
    void findBetweenReturnsOnlyEnteredDaysAscending() {
        dailySalesRepository.save(new DailySales(1L, LocalDate.of(2026, 7, 3), 300_000L));
        dailySalesRepository.save(new DailySales(1L, LocalDate.of(2026, 7, 1), 100_000L));
        dailySalesRepository.save(new DailySales(2L, LocalDate.of(2026, 7, 2), 999_000L)); // 다른 매장

        List<DailySales> result = dailySalesRepository
                .findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(
                        1L, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 7, 7));

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getSaleDate()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(result.get(1).getSaleDate()).isEqualTo(LocalDate.of(2026, 7, 3));
        assertThat(dailySalesRepository.existsByStoreIdAndSaleDate(1L, LocalDate.of(2026, 7, 1))).isTrue();
        assertThat(dailySalesRepository.existsByStoreIdAndSaleDate(1L, LocalDate.of(2026, 7, 2))).isFalse();
    }
}
