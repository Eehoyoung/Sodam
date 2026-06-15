package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.response.EmployeeAnnualLeaveDto;
import com.rich.sodam.dto.response.EmployeeSeveranceDto;
import com.rich.sodam.dto.response.StoreLaborSummaryDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.LaborAggregationService;
import com.rich.sodam.service.StoreAccessGuard;
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

import java.time.YearMonth;
import java.util.List;

/**
 * 인건비·연차·퇴직금 집계뷰 API (PRO 대시보드). 사장 본인 소유 매장만 — {@link StoreAccessGuard} 검증.
 */
@MasterOnly
@RestController
@RequestMapping("/api/master/labor")
@RequiredArgsConstructor
@Tag(name = "노무 집계", description = "인건비·연차·퇴직금 집계뷰")
public class LaborAggregationController {

    private final LaborAggregationService laborAggregationService;
    private final StoreAccessGuard guard;

    @Operation(summary = "매장 인건비 집계", description = "활성 직원수·인건비총액·평균시급. 매출 제공 시 인건비비율도 산출. (PRO)")
    @RequirePlan(min = PlanType.PRO)
    @GetMapping("/stores/{storeId}/summary")
    public ResponseEntity<StoreLaborSummaryDto> summary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) Long monthlyRevenue) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        YearMonth ym = (month == null || month.isBlank()) ? YearMonth.now() : YearMonth.parse(month);
        return ResponseEntity.ok(laborAggregationService.storeLaborSummary(storeId, ym, monthlyRevenue));
    }

    @Operation(summary = "매장 연차 집계", description = "활성 직원별 발생 연차일수(추정·출근율 100% 가정). (PRO)")
    @RequirePlan(min = PlanType.PRO, features = com.rich.sodam.domain.type.PlanFeature.ANNUAL_LEAVE)
    @GetMapping("/stores/{storeId}/annual-leave")
    public ResponseEntity<List<EmployeeAnnualLeaveDto>> annualLeave(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborAggregationService.annualLeaveSummary(storeId));
    }

    @Operation(summary = "매장 퇴직금 추정", description = "활성 직원별 퇴직금 추정(평균임금·재직기간 기준). (PRO)")
    @RequirePlan(min = PlanType.PRO)
    @GetMapping("/stores/{storeId}/severance")
    public ResponseEntity<List<EmployeeSeveranceDto>> severance(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(laborAggregationService.severanceEstimates(storeId));
    }
}
