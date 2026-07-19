package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.MasterOnly;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

/**
 * 친구 추천 (Phase 2 — 보상은 SubscriptionService 와 연동 시 적용).
 */
@MasterOnly
@RestController
@RequestMapping("/api/referrals")
@RequiredArgsConstructor
@Tag(name = "친구 추천", description = "추천 코드 발급/적용/이력")
public class ReferralController {

    private final com.rich.sodam.service.ReferralRewardService referralRewardService;

    @Operation(summary = "내 추천 코드 조회/발급",
            description = "사용자당 1개 고정 코드 발급. 영문+숫자 8자리.")
    @GetMapping("/my-code")
    public ResponseEntity<Map<String, Object>> myCode(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(referralRewardService.myCode(principal.getId()));
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ApplyReq {
        @NotBlank
        private String code;
    }

    @Operation(summary = "추천 코드 적용 (피추천자)",
            description = "회원가입 직후 또는 첫 결제 전 1회. 본인 코드 적용 불가.")
    @PostMapping("/apply")
    public ResponseEntity<Map<String, String>> apply(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ApplyReq req) {
        com.rich.sodam.service.ReferralRewardService.ApplyResult result =
                referralRewardService.applyReferralCode(principal.getId(), req.getCode());
        if (!result.success()) {
            return ResponseEntity.badRequest().body(Map.of("message", result.message()));
        }
        return ResponseEntity.ok(Map.of("message", result.message()));
    }

    @Operation(summary = "내 레퍼럴 보상 요약(S2)",
            description = "전환 완료 건수·적립 무료 개월. 읽기 전용(빌링 적용은 인간 승인 후).")
    @GetMapping("/my-rewards")
    public ResponseEntity<com.rich.sodam.service.ReferralRewardService.ReferralRewardSummary> myRewards(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(referralRewardService.myRewards(principal.getId()));
    }

    @Operation(summary = "내가 추천한 친구 이력")
    @GetMapping("/my-history")
    public ResponseEntity<List<Map<String, Object>>> myHistory(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(referralRewardService.myHistory(principal.getId()));
    }
}
