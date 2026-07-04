package com.rich.sodam.repository;

import com.rich.sodam.domain.DailySales;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 일일 매출 레포지토리.
 */
public interface DailySalesRepository extends JpaRepository<DailySales, Long> {

    /** 매장의 특정 날짜 매출 조회 (upsert 판정용). */
    Optional<DailySales> findByStoreIdAndSaleDate(Long storeId, LocalDate saleDate);

    /** 매장의 기간 내 매출 목록 (오름차순). */
    List<DailySales> findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(Long storeId, LocalDate from, LocalDate to);

    /** 해당 날짜 매출 입력 여부 (리마인더 배치용). */
    boolean existsByStoreIdAndSaleDate(Long storeId, LocalDate saleDate);
}
