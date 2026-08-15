package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.dto.response.LaborHealthResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.LaborHealthScoreService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * 노무 건강도 대시보드 API (WP-7, 사장 전용) — 0~100 참고 점수 + 건수 요약.
 *
 * <p>플랜 게이팅: {@code /labor-health}는 LABOR_LAW_BASIC(건수·유형만), {@code /labor-health/detail}은
 * LABOR_LAW_FULL(설명·해소 가이드까지)이 필요하다. 미충족 시 402 + errorCode(FE 페이월 분기).
 *
 * <p>이 요약은 {@link com.rich.sodam.controller.LaborRiskController}의 상세 목록
 * ({@code /api/stores/{storeId}/labor-risk}, 게이팅 없음 — 기존 WP-1 배선 유지)과 별개다.
 * 홈 화면 상단 카드는 데모·저사양 플랜에서도 항상 동작해야 해서 게이팅 없는 상세 엔드포인트를
 * 그대로 쓰고, 이 요약 API는 플랜 게이팅 인프라 자체를 증명하는 용도로 별도 배선했다.
 */
@MasterOnly
@RestController
@RequiredArgsConstructor
@Tag(name = "노무 건강도", description = "매장 노무 건강도 요약(0~100 참고 점수 + 건수, 사장 전용, 플랜 게이팅)")
public class LaborHealthController {

    private final LaborHealthScoreService laborHealthScoreService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @RequirePlan(features = PlanFeature.LABOR_LAW_BASIC)
    @Operation(summary = "노무 건강도 요약(건수·유형)",
            description = "0~100 참고 점수 + DANGER/WARN 건수 + 유형 목록(설명 문구 제외). LABOR_LAW_BASIC 이상 필요.")
    @GetMapping("/api/stores/{storeId}/labor-health")
    public ResponseEntity<LaborHealthResponse> summary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborHealthScoreService.summarize(storeId, false));
    }

    @RequirePlan(features = PlanFeature.LABOR_LAW_FULL)
    @Operation(summary = "노무 건강도 상세(설명·해소 가이드 포함)",
            description = "요약과 동일한 항목에 설명 문구까지 포함. LABOR_LAW_FULL(PRO 이상) 필요.")
    @GetMapping("/api/stores/{storeId}/labor-health/detail")
    public ResponseEntity<LaborHealthResponse> detail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborHealthScoreService.summarize(storeId, true));
    }
}
