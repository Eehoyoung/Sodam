package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.PurchaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * 영수증 경량 매입장부 API (F-BUY-01). 사장 전용(@MasterOnly + 자기 매장 가드).
 *
 * <p>흐름: (선택) 영수증 촬영 → /scan OCR 초안 → 사장 보정 → POST 저장.
 * 가격비교(/price-trend)·발주참고(/reorder) 로 매입 단가·주기를 확인.
 * <p>스코프: 매입 기록·비교까지만 — 재고 차감·원가율·POS 없음(IDENTITY §8).
 */
@Slf4j
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/purchases")
@RequiredArgsConstructor
@Tag(name = "매입장부", description = "영수증 기반 매입 기록·가격비교·발주참고 (사장)")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "영수증 OCR 초안(미저장)",
            description = "영수증 이미지에서 품목/수량/단가 초안을 추출. OCR 미설정 시 빈 초안(수기 입력). 저장 전 보정 필요.")
    @PostMapping(value = "/scan", consumes = "multipart/form-data")
    public ResponseEntity<ReceiptDraftResponse> scan(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam("image") MultipartFile image) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (IOException e) {
            throw new IllegalArgumentException("영수증 이미지를 읽을 수 없어요.");
        }
        return ResponseEntity.ok(purchaseService.scan(bytes, image.getContentType()));
    }

    @Operation(summary = "매입 저장", description = "보정한 매입(거래처·일자·품목·수량·단가)을 저장.")
    @PostMapping
    public ResponseEntity<PurchaseResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody PurchaseSaveRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.create(storeId, req));
    }

    @Operation(summary = "매입 목록", description = "기간(from~to)·분류(category)로 필터. 미지정 시 전체.")
    @GetMapping
    public ResponseEntity<List<PurchaseResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) PurchaseCategory category) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.list(storeId, from, to, category));
    }

    @Operation(summary = "매입 단건 조회")
    @GetMapping("/{purchaseId}")
    public ResponseEntity<PurchaseResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long purchaseId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.get(storeId, purchaseId));
    }

    @Operation(summary = "매입 수정", description = "거래처·일자·분류·품목 전체 교체.")
    @PutMapping("/{purchaseId}")
    public ResponseEntity<PurchaseResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long purchaseId,
            @Valid @RequestBody PurchaseSaveRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.update(storeId, purchaseId, req));
    }

    @Operation(summary = "매입 삭제")
    @DeleteMapping("/{purchaseId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long purchaseId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        purchaseService.delete(storeId, purchaseId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "가격비교", description = "한 품목의 시점·거래처별 단가 추이 + 직전 대비 변동률 + 최저가 거래처.")
    @GetMapping("/price-trend")
    public ResponseEntity<PriceTrendResponse> priceTrend(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam String item) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.priceTrend(storeId, item));
    }

    @Operation(summary = "발주 참고", description = "최근 N일 매입을 품목별로 묶어 매입주기·최근수량 산출(재고 차감 아님).")
    @GetMapping("/reorder")
    public ResponseEntity<List<ReorderHintResponse>> reorder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "30") int days) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.reorderHints(storeId, days));
    }
}
