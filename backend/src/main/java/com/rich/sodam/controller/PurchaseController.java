package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PurchaseCategory;
import com.rich.sodam.dto.request.PurchaseSaveRequest;
import com.rich.sodam.dto.response.MonthlySummaryResponse;
import com.rich.sodam.dto.response.PriceTrendResponse;
import com.rich.sodam.dto.response.PurchaseResponse;
import com.rich.sodam.dto.response.ReceiptDraftResponse;
import com.rich.sodam.dto.response.ReorderHintResponse;
import com.rich.sodam.dto.response.VendorSummaryResponse;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
        return ResponseEntity.ok(purchaseService.scan(storeId, bytes, image.getContentType()));
    }

    @Operation(summary = "영수증 원본 조회", description = "스캔 시 저장된 영수증 원본 이미지를 반환. 이 매장 소유 파일이 아니면 404.")
    @GetMapping("/receipt-image")
    public ResponseEntity<byte[]> receiptImage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam String ref) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return purchaseService.loadReceiptImage(storeId, ref)
                .map(bytes -> ResponseEntity.ok()
                        .contentType(inferImageType(ref))
                        .header(HttpHeaders.CACHE_CONTROL, "private, max-age=86400")
                        .body(bytes))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static MediaType inferImageType(String ref) {
        String lower = ref.toLowerCase();
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (lower.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        return MediaType.IMAGE_JPEG;
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

    @Operation(summary = "거래처별 매입 집계", description = "기간(from~to) 내 거래처별 합계·건수·비중. 미지정 시 전체 기간.")
    @GetMapping("/vendor-summary")
    public ResponseEntity<List<VendorSummaryResponse>> vendorSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.vendorSummary(storeId, from, to));
    }

    @Operation(summary = "월별 매입 추이", description = "최근 N개월(당월 포함) 매입 합계. 매입 없는 달도 0원으로 채운다.")
    @GetMapping("/monthly-summary")
    public ResponseEntity<List<MonthlySummaryResponse>> monthlySummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "6") int months) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.monthlySummary(storeId, months));
    }

    @Operation(summary = "품목명 자동완성", description = "이 매장에서 과거에 쓴 품목명 중 검색어를 포함하는 것을 최근 순으로 최대 8개.")
    @GetMapping("/item-suggestions")
    public ResponseEntity<List<String>> itemSuggestions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "") String q) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(purchaseService.itemSuggestions(storeId, q));
    }
}
