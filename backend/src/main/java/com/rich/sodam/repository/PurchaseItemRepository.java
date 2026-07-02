package com.rich.sodam.repository;

import com.rich.sodam.domain.PurchaseItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {

    /** 가격비교: 한 매장의 특정 품목(정규화 키) 매입 줄을 일자 오름차순으로. */
    List<PurchaseItem> findByPurchase_Store_IdAndNormalizedNameOrderByPurchase_PurchaseDateAscIdAsc(
            Long storeId, String normalizedName);

    /** 발주참고: 한 매장의 기간 내 모든 매입 줄(품목 그룹핑은 서비스에서). */
    List<PurchaseItem> findByPurchase_Store_IdAndPurchase_PurchaseDateGreaterThanEqual(
            Long storeId, LocalDate since);
}
