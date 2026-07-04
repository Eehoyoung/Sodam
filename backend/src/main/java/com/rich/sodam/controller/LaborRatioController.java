package com.rich.sodam.controller;

import com.rich.sodam.dto.response.CycleLaborRatioDto;
import com.rich.sodam.dto.response.DailyLaborRatioDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.LaborRatioService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 인건비율(인건비/매출) 조회 API — 사장 본인 소유 매장만 ({@link StoreAccessGuard} 검증).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/labor-ratio")
@RequiredArgsConstructor
@Tag(name = "인건비율", description = "일자별/정산주기별 인건비율 조회")
public class LaborRatioController {

    private final LaborRatioService laborRatioService;
    private final StoreAccessGuard guard;

    @Operation(summary = "일자별 인건비율", description = "출퇴근 기록 기반 인건비 ÷ 일일 매출. 매출 미입력/0원이면 ratio=null.")
    @GetMapping("/daily")
    public ResponseEntity<List<DailyLaborRatioDto>> daily(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborRatioService.daily(storeId, from, to));
    }

    @Operation(summary = "정산주기 인건비율", description = "매장 급여 정산주기 기준 현재 주기 누적 비율 + 직전 주기 비교.")
    @GetMapping("/cycle")
    public ResponseEntity<CycleLaborRatioDto> cycle(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborRatioService.cycle(storeId));
    }
}
