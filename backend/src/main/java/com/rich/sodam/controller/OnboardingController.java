package com.rich.sodam.controller;

import com.rich.sodam.dto.response.OnboardingResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.OnboardingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 직원 온보딩 체크리스트 (M-NEW-05 사장 / E-NEW-08 직원).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "온보딩", description = "직원 온보딩 진행 상태(계약·시급·첫출근)")
public class OnboardingController {

    private final OnboardingService onboardingService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "직원 온보딩 진행(사장)")
    @MasterOnly
    @GetMapping("/api/stores/{storeId}/employees/{employeeId}/onboarding")
    public ResponseEntity<OnboardingResponse> forOwner(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(onboardingService.forEmployee(storeId, employeeId));
    }

    @Operation(summary = "내 온보딩 진행(직원)", description = "소속 매장 자동 해석.")
    @GetMapping("/api/onboarding/my")
    public ResponseEntity<OnboardingResponse> forEmployee(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(onboardingService.forMyEmployee(principal.getId()));
    }
}
