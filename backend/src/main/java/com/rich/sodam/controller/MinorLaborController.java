package com.rich.sodam.controller;

import com.rich.sodam.dto.response.MinorGuardResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.MinorLaborGuardService;
import com.rich.sodam.service.StoreAccessGuard;
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
 * 연소근로자(만 18세 미만) 가드 (L-NEW-01) — 사장 전용 보호 기능.
 *
 * <p>직원 생년월일로 미성년 여부·근로 제약을 안내. 친권자 동의서 등 PII 원본은 저장하지 않음(플래그·안내만).
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/employees/{employeeId}")
@RequiredArgsConstructor
@Tag(name = "연소근로자 가드", description = "만 18세 미만 직원 근로 제약 안내 (사장)")
public class MinorLaborController {

    private final MinorLaborGuardService minorLaborGuardService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "연소근로자 확인",
            description = "직원이 만 18세 미만이면 1일7h/주35h·야간/휴일 제한·친권자 동의 필요를 안내. 참고용·노무사 확인 전.")
    @GetMapping("/minor-guard")
    public ResponseEntity<MinorGuardResponse> minorGuard(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(minorLaborGuardService.evaluate(employeeId, storeId));
    }
}
