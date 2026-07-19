package com.rich.sodam.controller;

import com.rich.sodam.dto.response.StoreSetupResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.StoreSetupService;
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
 * 매장 설정 완성도 + 다음 한 가지 액션 (GR-NEW-06). 사장 전용.
 * 유령매장(설정 미완) 절벽을 줄이는 activation 신호.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
@Tag(name = "매장 설정 완성도", description = "설정 완성도 게이지·다음 한 가지 액션 (사장)")
public class StoreSetupController {

    private final StoreSetupService storeSetupService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "매장 설정 완성도 조회",
            description = "매장정보·기준시급·운영시간·위치·직원 등록 항목별 완료 여부와 완성도 %, 다음 할 한 가지를 반환.")
    @GetMapping("/setup-progress")
    public ResponseEntity<StoreSetupResponse> setupProgress(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(storeSetupService.completeness(storeId));
    }
}
