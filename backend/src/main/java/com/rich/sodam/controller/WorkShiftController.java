package com.rich.sodam.controller;

import com.rich.sodam.dto.request.WorkShiftCreateRequest;
import com.rich.sodam.dto.response.WorkShiftResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.WorkShiftService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 근무 시프트 API (B10/E-NEW-05).
 *
 * <p>사장: 자기 매장 직원의 근무 일정 등록·조회·삭제(@MasterOnly + 매장 소유 가드).
 * 직원: 본인 근무 일정 조회({@code /api/shifts/my}, principal 본인 주체).
 * 스코프: 등록·조회만 — 채용·구인·자동배정 없음(Non-Goal).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "근무 시프트", description = "근무 일정 등록·조회 (사장 등록 / 직원 본인 조회)")
public class WorkShiftController {

    private final WorkShiftService workShiftService;
    private final StoreAccessGuard storeAccessGuard;

    @MasterOnly
    @Operation(summary = "근무 시프트 등록", description = "사장이 자기 매장 직원의 근무 일정을 등록.")
    @PostMapping("/api/stores/{storeId}/shifts")
    public ResponseEntity<WorkShiftResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody WorkShiftCreateRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(workShiftService.create(storeId, req));
    }

    @MasterOnly
    @Operation(summary = "매장 근무 시프트 목록", description = "기간(from~to)으로 매장 전체 근무 일정 조회.")
    @GetMapping("/api/stores/{storeId}/shifts")
    public ResponseEntity<List<WorkShiftResponse>> listForStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(workShiftService.listForStore(storeId, from, to));
    }

    @MasterOnly
    @Operation(summary = "근무 시프트 삭제", description = "매장 소유 검증 후 근무 일정 삭제.")
    @DeleteMapping("/api/stores/{storeId}/shifts/{shiftId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long shiftId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        workShiftService.delete(storeId, shiftId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "내 근무 시프트", description = "직원 본인의 기간(from~to) 근무 일정 조회.")
    @GetMapping("/api/shifts/my")
    public ResponseEntity<List<WorkShiftResponse>> listMy(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(workShiftService.listForEmployee(principal.getId(), from, to));
    }
}
