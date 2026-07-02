package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 영수증 경량 매입장부 서비스 — 저장·가격비교·발주참고 검증. F-BUY-01.
 * 스코프: 매입 기록·비교까지만(재고/원가율 없음).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PurchaseServiceTest {

    @Autowired private PurchaseService service;
    @Autowired private StoreRepository storeRepository;

    private Long store(String name, String biz) {
        Store s = new Store(name, biz, "02-1", "음식점", 12_000, 100);
        return storeRepository.save(s).getId();
    }

    private PurchaseSaveRequest.ItemRequest item(String name, double qty, String unit, int unitPrice) {
        PurchaseSaveRequest.ItemRequest it = new PurchaseSaveRequest.ItemRequest();
        it.setItemName(name);
        it.setQuantity(qty);
        it.setUnit(unit);
        it.setUnitPrice(unitPrice);
        return it;
    }

    private PurchaseSaveRequest req(String vendor, LocalDate date, PurchaseCategory cat,
                                    PurchaseSaveRequest.ItemRequest... items) {
        PurchaseSaveRequest r = new PurchaseSaveRequest();
        r.setVendorName(vendor);
        r.setPurchaseDate(date);
        r.setCategory(cat);
        r.setItems(List.of(items));
        return r;
    }

    @Test
    @DisplayName("매입 저장 → 합계 자동계산 + 목록 라운드트립")
    void createAndList() {
        Long storeId = store("매입매장A", "1110001111");
        PurchaseResponse saved = service.create(storeId, req("OO청과", LocalDate.of(2026, 6, 16),
                PurchaseCategory.VEGETABLE,
                item("양파", 20, "kg", 2100),     // 42,000
                item("대파", 5, "단", 3000)));     // 15,000

        assertThat(saved.totalAmount()).isEqualTo(57_000);
        assertThat(saved.items()).hasSize(2);
        assertThat(saved.categoryLabel()).isEqualTo("야채·청과");

        List<PurchaseResponse> list = service.list(storeId, null, null, null);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).vendorName()).isEqualTo("OO청과");
    }

    @Test
    @DisplayName("가격비교: 직전 대비 변동률 + 최저가 거래처")
    void priceTrend() {
        Long storeId = store("매입매장B", "1110002222");
        service.create(storeId, req("OO청과", LocalDate.of(2026, 5, 1),
                PurchaseCategory.VEGETABLE, item("양파", 10, "kg", 1800)));
        service.create(storeId, req("한빛청과", LocalDate.of(2026, 5, 20),
                PurchaseCategory.VEGETABLE, item("양파", 10, "kg", 2300)));
        service.create(storeId, req("OO청과", LocalDate.of(2026, 6, 16),
                PurchaseCategory.VEGETABLE, item(" 양파 ", 10, "kg", 2100))); // 공백 정규화

        PriceTrendResponse trend = service.priceTrend(storeId, "양파");

        assertThat(trend.points()).hasSize(3);
        assertThat(trend.currentUnitPrice()).isEqualTo(2100);
        assertThat(trend.previousUnitPrice()).isEqualTo(2300);
        // (2100-2300)/2300*100 = -8.7
        assertThat(trend.changeRatePercent()).isEqualTo(-8.7);
        assertThat(trend.cheapestUnitPrice()).isEqualTo(1800);
        assertThat(trend.cheapestVendor()).isEqualTo("OO청과");
    }

    @Test
    @DisplayName("발주참고: 매입횟수·평균주기·최근수량")
    void reorderHints() {
        Long storeId = store("매입매장C", "1110003333");
        service.create(storeId, req("OO청과", LocalDate.now().minusDays(20),
                PurchaseCategory.VEGETABLE, item("양파", 10, "kg", 1800)));
        service.create(storeId, req("OO청과", LocalDate.now().minusDays(10),
                PurchaseCategory.VEGETABLE, item("양파", 15, "kg", 2000)));
        service.create(storeId, req("OO청과", LocalDate.now(),
                PurchaseCategory.VEGETABLE, item("양파", 20, "kg", 2100)));

        List<ReorderHintResponse> hints = service.reorderHints(storeId, 30);
        assertThat(hints).hasSize(1);
        ReorderHintResponse onion = hints.get(0);
        assertThat(onion.purchaseCount()).isEqualTo(3);
        assertThat(onion.avgIntervalDays()).isEqualTo(10.0); // 20일 span / 2간격
        assertThat(onion.lastQuantity()).isEqualTo(20.0);
    }

    @Test
    @DisplayName("다른 매장 매입 단건 조회 차단")
    void crossStoreBlocked() {
        Long storeA = store("매입매장D", "1110004444");
        Long storeB = store("매입매장E", "1110005555");
        PurchaseResponse saved = service.create(storeA, req("OO청과", LocalDate.now(),
                PurchaseCategory.VEGETABLE, item("양파", 10, "kg", 2000)));

        assertThatThrownBy(() -> service.get(storeB, saved.id()))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("OCR 미설정(Noop): 빈 초안 반환 — 수기 입력 경로")
    void scanNoop() {
        ReceiptDraftResponse draft = service.scan(new byte[]{1, 2, 3}, "image/jpeg");
        assertThat(draft.ocrAvailable()).isFalse();
        assertThat(draft.items()).isEmpty();
        assertThat(draft.vendorName()).isNull();
    }
}
