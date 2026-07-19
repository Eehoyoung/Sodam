package com.rich.sodam.controller;

import com.rich.sodam.dto.request.DailySalesUpsertRequest;
import com.rich.sodam.dto.response.DailySalesResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.DailySalesService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 일일 매출 입력 API — 사장 본인 소유 매장만 ({@link StoreAuthorizationPolicy} 로 BOLA 차단).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/daily-sales")
@RequiredArgsConstructor
@Tag(name = "일일 매출", description = "사장 일일 매출 입력/조회")
public class DailySalesController {

    private final DailySalesService dailySalesService;
    private final StoreAuthorizationPolicy guard;

    @Operation(summary = "일일 매출 입력(upsert)", description = "같은 날 재입력 시 금액이 수정됩니다. 음수는 400.")
    @PostMapping
    public ResponseEntity<DailySalesResponse> upsert(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody DailySalesUpsertRequest body) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(DailySalesResponse.from(
                dailySalesService.upsert(storeId, body.saleDate(), body.amount())));
    }

    @Operation(summary = "최근 N일 매출 조회", description = "미입력 날짜는 응답에 없습니다(FE가 채움).")
    @GetMapping("/recent")
    public ResponseEntity<List<DailySalesResponse>> recent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "7") int days) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(dailySalesService.recent(storeId, days).stream()
                .map(DailySalesResponse::from)
                .toList());
    }
}
