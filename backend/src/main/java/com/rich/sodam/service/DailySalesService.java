package com.rich.sodam.service;

import com.rich.sodam.domain.DailySales;
import com.rich.sodam.repository.DailySalesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * 일일 매출 관리 — 사장이 하루 총매출을 입력하고, 인건비율 산출의 분모로 쓴다.
 *
 * <p>(storeId, saleDate) 는 유니크 — 같은 날 재입력하면 금액을 수정한다(upsert).
 * 매장 소유권 검증은 컨트롤러에서 {@link StoreAccessGuard} 로 수행한다.
 */
@Service
@RequiredArgsConstructor
public class DailySalesService {

    private final DailySalesRepository dailySalesRepository;

    /**
     * 매출 upsert — 해당 날짜 기록이 있으면 금액 수정, 없으면 생성.
     *
     * @throws IllegalArgumentException 날짜 누락 또는 금액이 null/음수인 경우 (→ 400)
     */
    @Transactional
    public DailySales upsert(Long storeId, LocalDate saleDate, Long amount) {
        if (saleDate == null) {
            throw new IllegalArgumentException("매출 날짜는 필수입니다.");
        }
        if (amount == null || amount < 0) {
            throw new IllegalArgumentException("매출액은 0원 이상이어야 합니다.");
        }
        return dailySalesRepository.findByStoreIdAndSaleDate(storeId, saleDate)
                .map(existing -> {
                    existing.updateAmount(amount);
                    return existing;
                })
                .orElseGet(() -> dailySalesRepository.save(new DailySales(storeId, saleDate, amount)));
    }

    /**
     * 최근 N일 매출 조회 (오늘 포함, 오름차순). 미입력 날짜는 결과에 없다 — FE 가 채운다.
     */
    @Transactional(readOnly = true)
    public List<DailySales> recent(Long storeId, int days) {
        if (days < 1) {
            throw new IllegalArgumentException("조회 일수는 1 이상이어야 합니다.");
        }
        LocalDate today = LocalDate.now();
        return dailySalesRepository.findByStoreIdAndSaleDateBetweenOrderBySaleDateAsc(
                storeId, today.minusDays(days - 1L), today);
    }
}
