package com.rich.sodam.controller;

import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.LaborRiskService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * 노무 리스크 대시보드 API (사장 전용).
 *
 * <p>기존 데이터(확정 시프트·출퇴근·근로계약서·시급·입사일)만 재사용해 매장의 잠재
 * 노무 리스크(주휴 경계·52시간 임박·계약서 미서명·최저임금·퇴직금 임박)를 한 번에 반환.
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "노무 리스크", description = "매장 노무 리스크 대시보드 (사장 전용)")
public class LaborRiskController {

    private final LaborRiskService laborRiskService;
    private final StoreAccessGuard storeAccessGuard;

    @MasterOnly
    @Operation(summary = "노무 리스크 대시보드",
            description = "주휴 15h 경계·주 52h 임박·계약서 미서명·최저임금 미달·퇴직금(1년 근속) 임박 리스크 목록.")
    @GetMapping("/api/stores/{storeId}/labor-risk")
    public ResponseEntity<LaborRiskResponse> getLaborRisk(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborRiskService.analyze(storeId));
    }
}
