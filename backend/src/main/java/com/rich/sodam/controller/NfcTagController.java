package com.rich.sodam.controller;

import com.rich.sodam.dto.request.StoreNfcTagCreateRequest;
import com.rich.sodam.dto.response.StoreNfcTagResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.StoreNfcTagService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 매장 NFC 태그 관리(사장 전용). 대리출근 방지를 위한 매장-태그 매핑을 등록/비활성화/조회.
 *
 * <p>모든 엔드포인트는 {@code @MasterOnly} + {@code StoreAccessGuard.assertMasterOwnsStore}
 * 로 보호 — 사장은 자기 소유 매장의 태그만 관리할 수 있다(IDOR 차단, WageController 패턴).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/nfc-tags")
@RequiredArgsConstructor
@Tag(name = "매장 NFC 태그", description = "사장이 매장 NFC 태그를 등록/비활성화/조회 (대리출근 방지)")
public class NfcTagController {

    private final StoreNfcTagService tagService;
    private final StoreAccessGuard guard;

    @Operation(summary = "NFC 태그 등록", description = "매장에 부착한 NFC 태그를 등록해요. 이후 출근 검증은 등록된 태그만 통과해요.")
    @PostMapping
    public ResponseEntity<StoreNfcTagResponse> register(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody StoreNfcTagCreateRequest req) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(tagService.register(storeId, req.getTagId(), req.getLabel()));
    }

    @Operation(summary = "NFC 태그 목록", description = "매장에 등록된 태그(활성/비활성) 목록을 조회해요.")
    @GetMapping
    public ResponseEntity<List<StoreNfcTagResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(tagService.list(storeId));
    }

    @Operation(summary = "NFC 태그 비활성화", description = "분실/교체 태그를 비활성화해요. 즉시 출근 검증에서 차단돼요.")
    @DeleteMapping("/{tagPk}")
    public ResponseEntity<Void> deactivate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long tagPk) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        tagService.deactivate(storeId, tagPk);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "NFC 태그 재활성화", description = "비활성 태그를 다시 활성화해요.")
    @PatchMapping("/{tagPk}/activate")
    public ResponseEntity<Void> activate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long tagPk) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        tagService.activate(storeId, tagPk);
        return ResponseEntity.noContent().build();
    }
}
