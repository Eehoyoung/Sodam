package com.rich.sodam.controller;

import com.rich.sodam.dto.request.ShiftTemplateCreateRequest;
import com.rich.sodam.dto.response.ApplyTemplateResponse;
import com.rich.sodam.dto.response.ShiftTemplateResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.ShiftTemplateService;
import com.rich.sodam.service.StoreAccessGuard;
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
 * 근무 시프트 템플릿 API (B10 후속). 사장 전용 — 매장 주간 패턴 저장/적용/관리.
 *
 * <p>모든 엔드포인트 @MasterOnly + 매장 소유 가드. 전 티어 허용(플랜 게이팅 없음).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "근무 시프트 템플릿", description = "매장 주간 근무 패턴 저장·적용 (사장 전용)")
public class ShiftTemplateController {

    private final ShiftTemplateService shiftTemplateService;
    private final StoreAccessGuard storeAccessGuard;

    @MasterOnly
    @Operation(summary = "템플릿 저장", description = "지정 기간(from~to)의 근무를 요일 패턴으로 스냅샷 저장.")
    @PostMapping("/api/stores/{storeId}/shift-templates")
    public ResponseEntity<ShiftTemplateResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody ShiftTemplateCreateRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(shiftTemplateService.createFromWeek(storeId, principal.getId(), req));
    }

    @MasterOnly
    @Operation(summary = "템플릿 목록", description = "매장 템플릿 목록(최신순).")
    @GetMapping("/api/stores/{storeId}/shift-templates")
    public ResponseEntity<List<ShiftTemplateResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(shiftTemplateService.list(storeId));
    }

    @MasterOnly
    @Operation(summary = "템플릿 상세", description = "엔트리(요일·직원·시간) 포함 상세.")
    @GetMapping("/api/stores/{storeId}/shift-templates/{templateId}")
    public ResponseEntity<ShiftTemplateResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long templateId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(shiftTemplateService.get(storeId, templateId));
    }

    @MasterOnly
    @Operation(summary = "템플릿 적용", description = "weekStart가 속한 주(월요일 기준)에 일괄 생성. 비활성 직원 엔트리는 스킵 보고.")
    @PostMapping("/api/stores/{storeId}/shift-templates/{templateId}/apply")
    public ResponseEntity<ApplyTemplateResponse> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long templateId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate weekStart) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(shiftTemplateService.apply(storeId, templateId, weekStart));
    }

    @MasterOnly
    @Operation(summary = "템플릿 삭제", description = "매장 소유 검증 후 삭제(엔트리 cascade).")
    @DeleteMapping("/api/stores/{storeId}/shift-templates/{templateId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long templateId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        shiftTemplateService.delete(storeId, templateId);
        return ResponseEntity.noContent().build();
    }
}
