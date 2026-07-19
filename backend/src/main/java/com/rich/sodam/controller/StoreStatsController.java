package com.rich.sodam.controller;

import com.rich.sodam.domain.type.ManagerPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.StoreStatsService;

import java.util.Map;

/**
 * 사장님 대시보드용 매장 통계 API (PRD_OWNER S-001).
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/store-queries")
@RequiredArgsConstructor
@Tag(name = "매장 조회/통계")
public class StoreStatsController {

    private final StoreStatsService storeStatsService;
    private final StoreAuthorizationPolicy guard;

    @Operation(summary = "오늘 출근 현황", description = "활성 직원 수 / 체크인 완료 / 미체크인 명단.")
    @GetMapping("/{storeId}/stats/today")
    public ResponseEntity<Map<String, Object>> today(@AuthenticationPrincipal UserPrincipal principal,
                                                     @PathVariable Long storeId) {
        guard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.DASHBOARD_VIEW);
        return ResponseEntity.ok(storeStatsService.today(storeId));
    }

    @Operation(summary = "이번 달 누적 급여", description = "이번 달 발급된 급여 명세서의 총합 + 근무시간 누계.")
    @MasterOnly
    @GetMapping("/{storeId}/stats/payroll/month-to-date")
    public ResponseEntity<Map<String, Object>> monthToDate(@AuthenticationPrincipal UserPrincipal principal,
                                                           @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(storeStatsService.monthToDate(storeId));
    }

    /**
     * OwnerDashboardScreen 합성 엔드포인트(DB_OPTIMIZATION_PLAN.md §Phase 9).
     *
     * <p>FE 가 {@code today}·{@code payroll/month-to-date}를 순차(waterfall)로 호출하던 구간을 왕복 1회로
     * 줄인다 — 두 통계는 서로 데이터 의존이 없고 같은 {@code storeId}만 필요하므로 합칠 수 있었다. 기존
     * 두 엔드포인트는 다른 화면·버전 호환을 위해 그대로 유지하고, 이 엔드포인트는 같은 조회 로직을
     * 재사용해 한 응답으로 묶기만 한다({@code storeId} 필드가 양쪽에 겹쳐 평탄화 대신 중첩 구조로 응답해
     * 네이밍 충돌을 피한다).</p>
     */
    @Operation(summary = "대시보드 합성 통계", description = "오늘 출근 현황 + 이번 달 누적 급여를 한 응답으로 반환(today/payroll/month-to-date 합성).")
    @MasterOnly
    @GetMapping("/{storeId}/stats/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(@AuthenticationPrincipal UserPrincipal principal,
                                                           @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(storeStatsService.dashboard(storeId));
    }
}
