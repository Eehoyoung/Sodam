package com.rich.sodam.service;

import com.rich.sodam.domain.Purchase;
import com.rich.sodam.domain.PurchaseItem;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.repository.PurchaseItemRepository;
import com.rich.sodam.repository.PurchaseRepository;
import com.rich.sodam.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 영수증 경량 매입장부 서비스. F-BUY-01.
 *
 * <p>거래처·일자·품목·수량·단가 기록 → <b>가격비교</b>·<b>발주참고</b>.
 * 자기 매장 권한 검증(StoreAccessGuard)은 컨트롤러에서 수행한다(기존 컨벤션).
 * <p>스코프 경계: 매입 기록·비교까지만. 재고 차감·원가율·마진(POS) 없음.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final StoreRepository storeRepository;
    private final ReceiptOcrClient receiptOcrClient;
    private final DomainEventService domainEventService;

    /** 영수증 OCR 자동인식 초안(미저장). OCR 미설정 시 빈 초안 → 수기 입력. */
    public ReceiptDraftResponse scan(byte[] image, String contentType) {
        return ReceiptDraftResponse.from(receiptOcrClient.parse(image, contentType));
    }

    @Transactional
    public PurchaseResponse create(Long storeId, PurchaseSaveRequest req) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new IllegalArgumentException("매장을 찾을 수 없어요: " + storeId));

        Purchase purchase = Purchase.create(store, req.getVendorName(), req.getPurchaseDate(), req.getCategory());
        for (PurchaseSaveRequest.ItemRequest it : req.getItems()) {
            purchase.addItem(PurchaseItem.of(it.getItemName(), it.getQuantity(), it.getUnit(), it.getUnitPrice()));
        }
        purchase.recalcTotal();
        purchase.setMemo(req.getMemo());
        purchase.setImageRef(req.getImageRef());
        purchase.setOptionalAmounts(req.getSupplyAmount(), req.getVatAmount());

        Purchase saved = purchaseRepository.save(purchase);
        log.info("매입 저장 store={} vendor={} items={} total={}",
                storeId, saved.getVendorName(), saved.getItems().size(), saved.getTotalAmount());
        domainEventService.record(DomainEventType.PURCHASE_SAVED, null, storeId,
                "category=" + req.getCategory());
        return PurchaseResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<PurchaseResponse> list(Long storeId, LocalDate from, LocalDate to, PurchaseCategory category) {
        List<Purchase> rows;
        if (from != null && to != null && category != null) {
            rows = purchaseRepository
                    .findByStore_IdAndCategoryAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(
                            storeId, category, from, to);
        } else if (from != null && to != null) {
            rows = purchaseRepository
                    .findByStore_IdAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(storeId, from, to);
        } else {
            rows = purchaseRepository.findByStore_IdOrderByPurchaseDateDescIdDesc(storeId);
            if (category != null) {
                rows = rows.stream().filter(p -> p.getCategory() == category).toList();
            }
        }
        return rows.stream().map(PurchaseResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public PurchaseResponse get(Long storeId, Long purchaseId) {
        return PurchaseResponse.from(loadOwned(storeId, purchaseId));
    }

    @Transactional
    public PurchaseResponse update(Long storeId, Long purchaseId, PurchaseSaveRequest req) {
        Purchase purchase = loadOwned(storeId, purchaseId);
        purchase.updateMeta(req.getVendorName(), req.getPurchaseDate(), req.getCategory(),
                req.getMemo(), req.getSupplyAmount(), req.getVatAmount());
        List<PurchaseItem> newItems = new ArrayList<>();
        for (PurchaseSaveRequest.ItemRequest it : req.getItems()) {
            newItems.add(PurchaseItem.of(it.getItemName(), it.getQuantity(), it.getUnit(), it.getUnitPrice()));
        }
        purchase.replaceItems(newItems);
        return PurchaseResponse.from(purchase);
    }

    @Transactional
    public void delete(Long storeId, Long purchaseId) {
        purchaseRepository.delete(loadOwned(storeId, purchaseId));
    }

    /**
     * 가격비교: 한 품목의 시점·거래처별 단가 추이 + 직전 대비 변동률 + 최저가 거래처.
     */
    @Transactional(readOnly = true)
    public PriceTrendResponse priceTrend(Long storeId, String itemName) {
        String norm = PurchaseItem.normalize(itemName);
        List<PurchaseItem> rows = purchaseItemRepository
                .findByPurchase_Store_IdAndNormalizedNameOrderByPurchase_PurchaseDateAscIdAsc(storeId, norm);

        List<PriceTrendResponse.Point> points = rows.stream()
                .map(it -> new PriceTrendResponse.Point(
                        it.getPurchase().getPurchaseDate(),
                        it.getPurchase().getVendorName(),
                        it.getUnitPrice(),
                        it.getQuantity(),
                        it.getUnit()))
                .toList();

        if (points.isEmpty()) {
            return new PriceTrendResponse(itemName, null, null, null, null, null, null, List.of());
        }

        String displayName = rows.get(rows.size() - 1).getItemName();
        String unit = rows.get(rows.size() - 1).getUnit();
        int current = points.get(points.size() - 1).unitPrice();
        Integer previous = points.size() >= 2 ? points.get(points.size() - 2).unitPrice() : null;
        Double changeRate = null;
        if (previous != null && previous != 0) {
            changeRate = BigDecimal.valueOf((current - previous) * 100.0 / previous)
                    .setScale(1, RoundingMode.HALF_UP).doubleValue();
        }
        PurchaseItem cheapest = rows.stream().min(Comparator.comparingInt(PurchaseItem::getUnitPrice)).orElseThrow();

        return new PriceTrendResponse(displayName, unit, current, previous, changeRate,
                cheapest.getPurchase().getVendorName(), cheapest.getUnitPrice(), points);
    }

    /**
     * 발주 참고: 최근 {@code days} 일 매입을 품목별로 묶어 매입주기·최근수량 산출.
     * 재고 차감이 아닌 참고용(스코프 라인).
     */
    @Transactional(readOnly = true)
    public List<ReorderHintResponse> reorderHints(Long storeId, int days) {
        LocalDate since = LocalDate.now().minusDays(days);
        List<PurchaseItem> rows = purchaseItemRepository
                .findByPurchase_Store_IdAndPurchase_PurchaseDateGreaterThanEqual(storeId, since);

        Map<String, List<PurchaseItem>> byItem = new LinkedHashMap<>();
        rows.stream()
                .sorted(Comparator.comparing((PurchaseItem it) -> it.getPurchase().getPurchaseDate()))
                .forEach(it -> byItem.computeIfAbsent(it.getNormalizedName(), k -> new ArrayList<>()).add(it));

        List<ReorderHintResponse> hints = new ArrayList<>();
        for (List<PurchaseItem> group : byItem.values()) {
            PurchaseItem last = group.get(group.size() - 1);
            Double avgInterval = null;
            if (group.size() >= 2) {
                long spanDays = ChronoUnit.DAYS.between(
                        group.get(0).getPurchase().getPurchaseDate(),
                        last.getPurchase().getPurchaseDate());
                avgInterval = BigDecimal.valueOf(spanDays / (double) (group.size() - 1))
                        .setScale(1, RoundingMode.HALF_UP).doubleValue();
            }
            hints.add(new ReorderHintResponse(
                    last.getItemName(), last.getUnit(), group.size(),
                    avgInterval, last.getPurchase().getPurchaseDate(), last.getQuantity()));
        }
        hints.sort(Comparator.comparingInt(ReorderHintResponse::purchaseCount).reversed());
        return hints;
    }

    private Purchase loadOwned(Long storeId, Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new IllegalArgumentException("매입 내역을 찾을 수 없어요: " + purchaseId));
        if (purchase.getStore() == null || !purchase.getStore().getId().equals(storeId)) {
            throw new AccessDeniedException("해당 매장의 매입 내역이 아니에요.");
        }
        return purchase;
    }
}
