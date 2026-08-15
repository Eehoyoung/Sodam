package com.rich.sodam.controller;

import com.rich.sodam.dto.response.HeadcountSimulationResponse;
import com.rich.sodam.dto.response.LaborRiskResponse;
import com.rich.sodam.dto.response.StatutoryHeadcountResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.LaborRiskService;
import com.rich.sodam.service.StatutoryHeadcountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
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
    private final StatutoryHeadcountService statutoryHeadcountService;
    private final StoreAuthorizationPolicy storeAccessGuard;

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

    @MasterOnly
    @Operation(summary = "상시근로자 수(근로기준법) 참고 산정 + 확대적용 로드맵",
            description = "근로기준법 시행령 §7의2 방식(산정기간 연인원 ÷ 가동일수) 참고 산정. "
                    + "통합고용세액공제 상시근로자 집계(/api/stores/{storeId}/tax/headcount-trend)와는 별개 산식·별개 값.")
    @GetMapping("/api/stores/{storeId}/labor-risk/statutory-headcount")
    public ResponseEntity<StatutoryHeadcountResponse> getStatutoryHeadcount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(statutoryHeadcountService.referenceHeadcount(storeId));
    }

    @MasterOnly
    @Operation(summary = "상시근로자 수 전환 시뮬레이션",
            description = "직원을 N명 더 채용하면 5인 이상 경계를 넘는지, 새로 적용될 조항, 인건비 영향 범위(참고용).")
    @GetMapping("/api/stores/{storeId}/labor-risk/statutory-headcount/simulate")
    public ResponseEntity<HeadcountSimulationResponse> simulateStatutoryHeadcount(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "1") int additionalEmployees) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(statutoryHeadcountService.simulateAddingEmployees(storeId, additionalEmployees));
    }
}
