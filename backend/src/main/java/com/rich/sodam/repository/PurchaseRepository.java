package com.rich.sodam.repository;

import com.rich.sodam.domain.Purchase;
import com.rich.sodam.domain.type.PurchaseCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    List<Purchase> findByStore_IdOrderByPurchaseDateDescIdDesc(Long storeId);

    List<Purchase> findByStore_IdAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(
            Long storeId, LocalDate from, LocalDate to);

    List<Purchase> findByStore_IdAndCategoryAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(
            Long storeId, PurchaseCategory category, LocalDate from, LocalDate to);
}
