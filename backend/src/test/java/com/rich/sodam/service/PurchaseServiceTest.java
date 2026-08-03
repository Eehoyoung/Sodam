package com.rich.sodam.service;

import com.rich.sodam.config.integration.ObjectStorage;
import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
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
    @Autowired private ObjectStorage objectStorage;

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
    @DisplayName("거래처별 집계: 합계·건수·비중을 금액 내림차순으로")
    void vendorSummary() {
        Long storeId = store("매입매장J", "1110010101");
        service.create(storeId, req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 1000))); // 10,000
        service.create(storeId, req("한빛주류", LocalDate.now(), PurchaseCategory.LIQUOR,
                item("소주", 20, "병", 1500))); // 30,000
        service.create(storeId, req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("대파", 5, "단", 2000))); // 10,000

        List<VendorSummaryResponse> summary = service.vendorSummary(storeId, null, null);

        assertThat(summary).hasSize(2);
        assertThat(summary.get(0).vendorName()).isEqualTo("한빛주류");
        assertThat(summary.get(0).totalAmount()).isEqualTo(30_000);
        assertThat(summary.get(0).purchaseCount()).isEqualTo(1);
        assertThat(summary.get(0).sharePercent()).isEqualTo(60.0); // 30000/50000*100
        assertThat(summary.get(1).vendorName()).isEqualTo("OO청과");
        assertThat(summary.get(1).totalAmount()).isEqualTo(20_000);
        assertThat(summary.get(1).purchaseCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("월별 매입 추이: 매입 없는 달도 0원으로 채운다")
    void monthlySummary() {
        Long storeId = store("매입매장K", "1110020202");
        service.create(storeId, req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 1000)));

        List<MonthlySummaryResponse> months = service.monthlySummary(storeId, 3);

        assertThat(months).hasSize(3);
        assertThat(months.get(2).totalAmount()).isEqualTo(10_000); // 당월(마지막 항목)
        assertThat(months.get(0).totalAmount()).isEqualTo(0); // 2개월 전 — 매입 없음
    }

    @Test
    @DisplayName("품목 자동완성: 검색어 포함 + 최근순 + 중복 제거")
    void itemSuggestions() {
        Long storeId = store("매입매장L", "1110030303");
        service.create(storeId, req("OO청과", LocalDate.now().minusDays(2), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 1000)));
        service.create(storeId, req("한빛청과", LocalDate.now().minusDays(1), PurchaseCategory.VEGETABLE,
                item("양파", 5, "kg", 1200))); // 중복 품목명 — 한 번만 나와야 함
        service.create(storeId, req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("대파", 3, "단", 2000)));

        List<String> suggestions = service.itemSuggestions(storeId, "양파");

        assertThat(suggestions).containsExactly("양파");
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
    @DisplayName("OCR 미설정(Noop): 빈 초안 반환 — 수기 입력 경로. 이미지는 OCR과 무관하게 저장돼 imageRef로 돌아온다")
    void scanNoop() {
        Long storeId = store("매입매장F", "1110006666");

        ReceiptDraftResponse draft = service.scan(storeId, new byte[]{1, 2, 3}, "image/jpeg");

        assertThat(draft.ocrAvailable()).isFalse();
        assertThat(draft.items()).isEmpty();
        assertThat(draft.vendorName()).isNull();
        assertThat(draft.imageRef()).isNotBlank();
        assertThat(draft.imageRef()).startsWith("stores/" + storeId + "/receipts/");
    }

    @Test
    @DisplayName("스캔한 영수증 이미지를 저장에 그대로 실으면 매입에 연결되고, 삭제 시 파일도 정리된다")
    void imageRefRoundTripsAndCleansUpOnDelete() {
        Long storeId = store("매입매장G", "1110007777");
        ReceiptDraftResponse scanned = service.scan(storeId, new byte[]{9, 9, 9}, "image/jpeg");

        PurchaseSaveRequest req = req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 2000));
        req.setImageRef(scanned.imageRef());

        PurchaseResponse saved = service.create(storeId, req);
        assertThat(saved.imageRef()).isEqualTo(scanned.imageRef());
        assertThat(objectStorage.get(scanned.imageRef())).isPresent();

        service.delete(storeId, saved.id());
        assertThat(objectStorage.get(scanned.imageRef())).isEmpty();
    }

    @Test
    @DisplayName("다른 매장의 imageRef를 저장 요청에 실어도 무시된다(BOLA)")
    void foreignStoreImageRefIsIgnored() {
        Long storeA = store("매입매장H", "1110008888");
        Long storeB = store("매입매장I", "1110009999");
        ReceiptDraftResponse scannedInB = service.scan(storeB, new byte[]{1, 2, 3}, "image/jpeg");

        PurchaseSaveRequest req = req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 2000));
        req.setImageRef(scannedInB.imageRef());

        PurchaseResponse saved = service.create(storeA, req);

        assertThat(saved.imageRef()).isNull();
    }
}
