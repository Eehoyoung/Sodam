package com.rich.sodam.controller;

import com.rich.sodam.dto.response.SubsidyEligibilityResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.SubsidyEligibilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 두루누리·고용지원금 자격 자동판정 (B7). 사장 전용. 자격 안내까지만(신청은 근로복지공단 위임).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/subsidy")
@RequiredArgsConstructor
@Tag(name = "지원금", description = "두루누리·고용지원금 자격 자동판정 (사장)")
public class SubsidyController {

    private final SubsidyEligibilityService subsidyEligibilityService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "지원금 자격 판정", description = "근로자 10인 미만·월보수 기준으로 두루누리 지원 가능 직원 추정.")
    @GetMapping("/eligibility")
    public ResponseEntity<SubsidyEligibilityResponse> eligibility(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(subsidyEligibilityService.evaluate(storeId));
    }
}
