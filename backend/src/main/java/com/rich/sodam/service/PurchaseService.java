package com.rich.sodam.service;

import com.rich.sodam.config.integration.ObjectStorage;
import com.rich.sodam.domain.Purchase;
import com.rich.sodam.domain.PurchaseItem;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
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
import java.util.Optional;

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

    private static final String RECEIPT_STORAGE_PREFIX = "stores/%d/receipts";

    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final StoreRepository storeRepository;
    private final ReceiptOcrClient receiptOcrClient;
    private final DomainEventService domainEventService;
    private final ObjectStorage objectStorage;

    /**
     * 영수증 OCR 자동인식 초안(미저장) + 원본 이미지 보관.
     * OCR 미설정 시 빈 초안 → 수기 입력. 이미지는 OCR 성공 여부와 무관하게 항상 저장한다 —
     * 사장이 나중에 원본을 다시 볼 수 있어야 하기 때문(2026-08-03 갭수정 WP-02).
     */
    @Transactional
    public ReceiptDraftResponse scan(Long storeId, byte[] image, String contentType) {
        ObjectStorage.PutResult stored = objectStorage.put(receiptPrefix(storeId), image, contentType);
        return ReceiptDraftResponse.from(receiptOcrClient.parse(image, contentType), stored.getStorageKey());
    }

    private static String receiptPrefix(Long storeId) {
        return String.format(RECEIPT_STORAGE_PREFIX, storeId);
    }

    /**
     * 저장된 영수증 원본 조회. {@code ref}가 이 매장 소유 접두사({@code stores/{storeId}/receipts/})로
     * 시작하지 않으면 다른 매장 파일을 가리키는 조작된 경로로 보고 거부한다(BOLA/경로 조작 차단).
     */
    @Transactional(readOnly = true)
    public Optional<byte[]> loadReceiptImage(Long storeId, String ref) {
        if (ref == null || ref.isBlank() || !ref.startsWith(receiptPrefix(storeId) + "/")) {
            return Optional.empty();
        }
        return objectStorage.get(ref);
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
        purchase.setImageRef(ownedImageRef(storeId, req.getImageRef()));
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
        String previousImageRef = purchase.getImageRef();
        String newImageRef = ownedImageRef(storeId, req.getImageRef());

        purchase.updateMeta(req.getVendorName(), req.getPurchaseDate(), req.getCategory(),
                req.getMemo(), req.getSupplyAmount(), req.getVatAmount());
        List<PurchaseItem> newItems = new ArrayList<>();
        for (PurchaseSaveRequest.ItemRequest it : req.getItems()) {
            newItems.add(PurchaseItem.of(it.getItemName(), it.getQuantity(), it.getUnit(), it.getUnitPrice()));
        }
        purchase.replaceItems(newItems);
        purchase.setImageRef(newImageRef);

        if (previousImageRef != null && !previousImageRef.equals(newImageRef)) {
            objectStorage.delete(previousImageRef); // 교체·제거된 옛 영수증 파일 정리 — 고아 파일 방지
        }
        return PurchaseResponse.from(purchase);
    }

    @Transactional
    public void delete(Long storeId, Long purchaseId) {
        Purchase purchase = loadOwned(storeId, purchaseId);
        if (purchase.getImageRef() != null) {
            objectStorage.delete(purchase.getImageRef());
        }
        purchaseRepository.delete(purchase);
    }

    /**
     * 클라이언트가 보낸 imageRef가 이 매장 소유 접두사로 시작하는지 검증한다.
     * 다른 매장의 영수증 키를 그대로 신뢰해 저장하면 안 되므로(BOLA), 접두사가 어긋나면 무시(null)한다.
     */
    private String ownedImageRef(Long storeId, String imageRef) {
        if (imageRef == null || imageRef.isBlank()) {
            return null;
        }
        return imageRef.startsWith(receiptPrefix(storeId) + "/") ? imageRef : null;
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

    /**
     * 거래처별 매입 집계(기간 내) — "이번 달 어디에 제일 많이 썼나"에 답한다. 금액 내림차순.
     * from/to 미지정 시 전체 기간(2026-08-03 갭수정 계획 WP-05).
     */
    @Transactional(readOnly = true)
    public List<VendorSummaryResponse> vendorSummary(Long storeId, LocalDate from, LocalDate to) {
        List<Purchase> rows = (from != null && to != null)
                ? purchaseRepository.findByStore_IdAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(storeId, from, to)
                : purchaseRepository.findByStore_IdOrderByPurchaseDateDescIdDesc(storeId);

        long periodTotal = rows.stream().mapToLong(Purchase::getTotalAmount).sum();

        Map<String, List<Purchase>> byVendor = new LinkedHashMap<>();
        rows.forEach(p -> byVendor.computeIfAbsent(p.getVendorName(), k -> new ArrayList<>()).add(p));

        List<VendorSummaryResponse> summary = new ArrayList<>();
        for (Map.Entry<String, List<Purchase>> entry : byVendor.entrySet()) {
            int vendorTotal = entry.getValue().stream().mapToInt(Purchase::getTotalAmount).sum();
            double share = periodTotal == 0 ? 0.0
                    : BigDecimal.valueOf(vendorTotal * 100.0 / periodTotal).setScale(1, RoundingMode.HALF_UP).doubleValue();
            summary.add(new VendorSummaryResponse(entry.getKey(), vendorTotal, entry.getValue().size(), share));
        }
        summary.sort(Comparator.comparingInt(VendorSummaryResponse::totalAmount).reversed());
        return summary;
    }

    /**
     * 최근 {@code months}개월 매입 합계 추이(당월 포함, 오래된 순). 매입이 없는 달도 0원으로 채운다
     * (2026-08-03 갭수정 계획 WP-05) — 막대 그래프가 끊기지 않게.
     */
    @Transactional(readOnly = true)
    public List<MonthlySummaryResponse> monthlySummary(Long storeId, int months) {
        LocalDate today = LocalDate.now();
        LocalDate since = today.minusMonths(months - 1L).withDayOfMonth(1);
        List<Purchase> rows = purchaseRepository
                .findByStore_IdAndPurchaseDateBetweenOrderByPurchaseDateDescIdDesc(storeId, since, today);

        Map<String, Integer> totalsByMonth = new LinkedHashMap<>();
        for (int i = months - 1; i >= 0; i--) {
            LocalDate d = today.minusMonths(i);
            totalsByMonth.put(String.format("%04d-%02d", d.getYear(), d.getMonthValue()), 0);
        }
        for (Purchase p : rows) {
            String key = String.format("%04d-%02d", p.getPurchaseDate().getYear(), p.getPurchaseDate().getMonthValue());
            totalsByMonth.merge(key, p.getTotalAmount(), Integer::sum);
        }

        List<MonthlySummaryResponse> result = new ArrayList<>();
        totalsByMonth.forEach((yearMonth, total) -> result.add(new MonthlySummaryResponse(yearMonth, total)));
        return result;
    }

    /**
     * 품목명 자동완성 — 이 매장에서 과거에 쓴 품목명 중 검색어를 포함하는 것을 최근 순으로 최대 8개.
     * 오타로 인한 정규화 키 분산(예: "양파"/"양 파")을 줄여 가격비교 정확도를 끌어올리는 목적
     * (2026-08-03 갭수정 계획 WP-05).
     */
    @Transactional(readOnly = true)
    public List<String> itemSuggestions(Long storeId, String query) {
        String norm = PurchaseItem.normalize(query);
        List<PurchaseItem> rows = purchaseItemRepository.findByPurchase_Store_IdOrderByIdDesc(storeId);

        java.util.LinkedHashSet<String> seenKeys = new java.util.LinkedHashSet<>();
        List<String> suggestions = new ArrayList<>();
        for (PurchaseItem it : rows) {
            if (suggestions.size() >= 8) break;
            if (!norm.isEmpty() && !it.getNormalizedName().contains(norm)) continue;
            if (seenKeys.add(it.getNormalizedName())) {
                suggestions.add(it.getItemName());
            }
        }
        return suggestions;
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
