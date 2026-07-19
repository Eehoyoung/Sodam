package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.InsuranceFilingRequest;
import com.rich.sodam.dto.response.InsuranceFilingForm;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.InsuranceFilingService;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 4대보험 신고서 서식 자동작성 API (PRO 전용). 사장이 직접 제출하는 보조 자료만 제공 — 대행 안 함.
 */
@MasterOnly
@RestController
@RequestMapping("/api/master/insurance")
@RequiredArgsConstructor
@Tag(name = "노무 집계", description = "4대보험 신고서 서식 자동작성(PRO)")
public class InsuranceFilingController {

    private final InsuranceFilingService insuranceFilingService;
    private final StoreAuthorizationPolicy guard;

    @Operation(summary = "4대보험 신고서 생성",
            description = "PRO 플랜 전용. 취득/상실/보수월액 신고서 서식을 채워 반환. 제출은 사장이 직접.")
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.INSURANCE_FILING)
    @PostMapping("/stores/{storeId}/filings")
    public ResponseEntity<InsuranceFilingForm> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody InsuranceFilingRequest req) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(insuranceFilingService.generateForm(storeId, req));
    }
}
