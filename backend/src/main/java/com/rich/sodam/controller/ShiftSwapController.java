package com.rich.sodam.controller;

import com.rich.sodam.domain.type.SwapRequestStatus;
import com.rich.sodam.dto.request.SwapApproveRequest;
import com.rich.sodam.dto.response.ShiftSwapRequestResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.ShiftSwapService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 대타 구하기(시프트 스왑) API.
 *
 * <p>사장: 모집 생성/승인/취소(@MasterOnly + 매장 소유 가드).
 * 직원: 모집 조회(매장 구성원)·지원(재직 직원 본인).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "대타 구하기", description = "시프트 대타 모집·지원·승인 (사장 모집/승인, 직원 지원)")
public class ShiftSwapController {

    private final ShiftSwapService shiftSwapService;
    private final StoreAccessGuard storeAccessGuard;

    @MasterOnly
    @Operation(summary = "대타 모집 생성", description = "해당 시프트를 대타 모집으로 전환. 매장 전 직원(원 배정자 제외)에게 알림. 지난 시프트 400, 중복 모집 409.")
    @PostMapping("/api/shifts/{shiftId}/swap-requests")
    public ResponseEntity<ShiftSwapRequestResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long shiftId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), shiftSwapService.storeIdOfShift(shiftId));
        return ResponseEntity.ok(shiftSwapService.create(shiftId));
    }

    @Operation(summary = "매장 대타 모집 목록", description = "사장·직원 모두 조회 가능(매장 구성원 검증). 시프트 날짜/시간과 지원자 목록 포함.")
    @GetMapping("/api/stores/{storeId}/swap-requests")
    public ResponseEntity<List<ShiftSwapRequestResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) SwapRequestStatus status) {
        storeAccessGuard.assertMemberOfStore(principal.getId(), storeId);
        return ResponseEntity.ok(shiftSwapService.list(storeId, status));
    }

    @Operation(summary = "대타 지원", description = "직원 본인이 모집에 지원. 원 배정자 400, 중복 지원·마감 모집 409.")
    @PostMapping("/api/swap-requests/{id}/apply")
    public ResponseEntity<Void> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        storeAccessGuard.assertEmployeeInStore(principal.getId(), shiftSwapService.storeIdOfRequest(id));
        shiftSwapService.apply(id, principal.getId());
        return ResponseEntity.ok().build();
    }

    @MasterOnly
    @Operation(summary = "대타 승인", description = "지원자 중 한 명을 승인 — 시프트를 승인자에게 재배정하고 FILLED 전이. 승인자에게 확정, 탈락자에게 마감 알림.")
    @PostMapping("/api/swap-requests/{id}/approve")
    public ResponseEntity<ShiftSwapRequestResponse> approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody SwapApproveRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), shiftSwapService.storeIdOfRequest(id));
        return ResponseEntity.ok(shiftSwapService.approve(id, req.getEmployeeId()));
    }

    @MasterOnly
    @Operation(summary = "대타 모집 취소", description = "OPEN 모집을 취소(CANCELLED). 마감된 모집은 409.")
    @PostMapping("/api/swap-requests/{id}/cancel")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), shiftSwapService.storeIdOfRequest(id));
        shiftSwapService.cancel(id);
        return ResponseEntity.ok().build();
    }
}
