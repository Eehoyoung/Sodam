package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.PurchaseService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 매입장부 API 권한 — 미소유 매장 접근 시 StoreAuthorizationPolicy 가 차단(BOLA)하고 서비스에
 * 도달하지 않는다. 2026-08-03 갭수정 계획 WP-04: 서비스 계층 테스트(PurchaseServiceTest)만 있고
 * 컨트롤러 계층 권한 검증이 없던 공백을 메운다.
 */
@ExtendWith(MockitoExtension.class)
class PurchaseControllerTest {

    @Mock
    PurchaseService purchaseService;
    @Mock
    StoreAuthorizationPolicy guard;
    @InjectMocks
    PurchaseController controller;

    private final UserPrincipal principal = new UserPrincipal(99L, "boss@sodam.dev", List.of());

    private PurchaseSaveRequest sampleRequest() {
        PurchaseSaveRequest req = new PurchaseSaveRequest();
        req.setVendorName("OO청과");
        req.setPurchaseDate(LocalDate.of(2026, 8, 1));
        req.setCategory(PurchaseCategory.VEGETABLE);
        PurchaseSaveRequest.ItemRequest item = new PurchaseSaveRequest.ItemRequest();
        item.setItemName("양파");
        item.setQuantity(10);
        item.setUnit("kg");
        item.setUnitPrice(2000);
        req.setItems(List.of(item));
        return req;
    }

    private void denyStore(Long storeId) {
        doThrow(new AccessDeniedException("해당 매장에 대한 권한이 없어요."))
                .when(guard).assertMasterOwnsStore(99L, storeId);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매입 저장 시 403 — 서비스 미호출")
    void createDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.create(principal, 7L, sampleRequest()))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매입 목록 조회 시 403 — 서비스 미호출")
    void listDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.list(principal, 7L, null, null, null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매입 단건 조회 시 403 — 서비스 미호출")
    void getDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.get(principal, 7L, 1L))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매입 수정 시 403 — 서비스 미호출")
    void updateDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.update(principal, 7L, 1L, sampleRequest()))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 매입 삭제 시 403 — 서비스 미호출")
    void deleteDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.delete(principal, 7L, 1L))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 가격비교 조회 시 403 — 서비스 미호출")
    void priceTrendDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.priceTrend(principal, 7L, "양파"))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 발주 참고 조회 시 403 — 서비스 미호출")
    void reorderDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.reorder(principal, 7L, 30))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 영수증 원본 조회 시 403 — 서비스 미호출")
    void receiptImageDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.receiptImage(principal, 7L, "stores/7/receipts/x.jpg"))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 거래처별 집계 조회 시 403 — 서비스 미호출")
    void vendorSummaryDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.vendorSummary(principal, 7L, null, null))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 월별 추이 조회 시 403 — 서비스 미호출")
    void monthlySummaryDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.monthlySummary(principal, 7L, 6))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }

    @Test
    @DisplayName("소유하지 않은 매장 품목 자동완성 조회 시 403 — 서비스 미호출")
    void itemSuggestionsDeniedForNonOwner() {
        denyStore(7L);

        assertThatThrownBy(() -> controller.itemSuggestions(principal, 7L, "양파"))
                .isInstanceOf(AccessDeniedException.class);

        verifyNoInteractions(purchaseService);
    }
}
