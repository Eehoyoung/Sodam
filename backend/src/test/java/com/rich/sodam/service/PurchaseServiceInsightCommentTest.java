package com.rich.sodam.service;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.repository.StoreRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WP-5 — 매입장부 인사이트 코멘트(insightComment) 배선 테스트. 테스트 프로필은 sodam.ai.provider가
 * 미설정이라 AnthropicTextClient 빈이 없다 — "vendorSummary/monthlySummary 재사용 위임"과
 * "provider 미설정 시 comment=null" 을 함께 실측한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PurchaseServiceInsightCommentTest {

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
    @DisplayName("매입 데이터가 있어도 provider 미설정 상태에서 comment는 null이다(외부 호출 0)")
    void insightCommentFallsBackToNullWhenProviderUnset() {
        Long storeId = store("인사이트매장A", "1120001111");
        service.create(storeId, req("OO청과", LocalDate.now(), PurchaseCategory.VEGETABLE,
                item("양파", 10, "kg", 1000)));

        String comment = service.insightComment(storeId, null, null, 6);

        assertThat(comment).isNull();
    }

    @Test
    @DisplayName("매입 데이터가 없는 매장도 예외 없이 comment=null을 반환한다")
    void insightCommentHandlesEmptyStore() {
        Long storeId = store("인사이트매장B", "1120002222");

        String comment = service.insightComment(storeId, null, null, 6);

        assertThat(comment).isNull();
    }
}
