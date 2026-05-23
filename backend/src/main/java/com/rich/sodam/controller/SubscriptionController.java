package com.rich.sodam.controller;

import com.rich.sodam.domain.Subscription;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.BillingKeyIssueRequest;
import com.rich.sodam.dto.response.SubscriptionResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.MasterOnly;

/**
 * 구독·정기결제 API.
 *
 * 흐름:
 *  1. FE → 토스 SDK 로 카드 인증 → authKey 획득
 *  2. FE → POST /api/billing/subscribe (authKey + plan) → 빌링키 교환 + 첫 청구
 *  3. 이후 매월 자동 청구는 BillingScheduler 가 처리
 */
@MasterOnly
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
@Tag(name = "구독·결제", description = "정기결제 가입/조회/해지 API")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @Operation(summary = "구독 가입(유료)", description = "토스에서 받은 authKey 로 빌링키 발급 후 첫 결제까지 진행합니다.")
    @PostMapping("/subscribe")
    public ResponseEntity<SubscriptionResponse> subscribe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BillingKeyIssueRequest req) {
        Subscription s = subscriptionService.subscribe(principal.getId(), req.getPlan(), req.getAuthKey());
        return ResponseEntity.ok(SubscriptionResponse.from(s));
    }

    @Operation(summary = "무료 플랜 가입", description = "카드 없이 즉시 무료 플랜 활성화.")
    @PostMapping("/subscribe/free")
    public ResponseEntity<SubscriptionResponse> subscribeFree(
            @AuthenticationPrincipal UserPrincipal principal) {
        Subscription s = subscriptionService.subscribeFree(principal.getId());
        return ResponseEntity.ok(SubscriptionResponse.from(s));
    }

    @Operation(summary = "내 구독 조회")
    @GetMapping("/me")
    public ResponseEntity<SubscriptionResponse> myCurrent(
            @AuthenticationPrincipal UserPrincipal principal) {
        Subscription s = subscriptionService.currentSubscription(principal.getId());
        if (s == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(SubscriptionResponse.from(s));
    }

    @Operation(summary = "플랜 카탈로그", description = "FE 가 사용할 정적 플랜 정보. 외부 의존 없음.")
    @GetMapping("/plans")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> plans() {
        // enum 배열 직렬화 시 Jackson 이 description/displayName 한글 직렬화에서 실패할 수 있어
        // 명시적 Map 리스트로 변환.
        java.util.List<java.util.Map<String, Object>> list = new java.util.ArrayList<>();
        for (PlanType p : PlanType.values()) {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("name", p.name());
            m.put("displayName", p.getDisplayName());
            m.put("monthlyPriceKrw", p.getMonthlyPriceKrw());
            m.put("description", p.getDescription());
            m.put("paid", p.isPaid());
            list.add(m);
        }
        return ResponseEntity.ok(list);
    }

    @Operation(summary = "구독 해지", description = "다음 결제일 전까지 ACTIVE, 이후 EXPIRED.")
    @DeleteMapping("/cancel")
    public ResponseEntity<Void> cancel(@AuthenticationPrincipal UserPrincipal principal) {
        subscriptionService.cancel(principal.getId());
        return ResponseEntity.noContent().build();
    }
}
