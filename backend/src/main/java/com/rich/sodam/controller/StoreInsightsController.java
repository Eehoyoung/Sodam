package com.rich.sodam.controller;

import com.rich.sodam.dto.response.WeeklyInsightsResponse;
import com.rich.sodam.domain.type.ManagerPermission;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.DomainEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사장용 주간 인사이트 (A6) — 퍼널 이벤트 집계 기반 매장 활동 요약.
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/stores/{storeId}/insights")
@RequiredArgsConstructor
@Tag(name = "인사이트", description = "매장 주간 활동 요약 (퍼널 계측)")
public class StoreInsightsController {

    private final DomainEventService domainEventService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "주간 인사이트", description = "최근 N일(기본 7) 이벤트 종류별 카운트.")
    @GetMapping("/weekly")
    public ResponseEntity<WeeklyInsightsResponse> weekly(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(defaultValue = "7") int days) {
        storeAccessGuard.assertMasterOrManagerPermission(principal.getId(), storeId, ManagerPermission.DASHBOARD_VIEW);
        return ResponseEntity.ok(domainEventService.weeklyInsights(storeId, days));
    }
}
