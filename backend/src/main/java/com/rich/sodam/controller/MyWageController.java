package com.rich.sodam.controller;

import com.rich.sodam.dto.response.MyWageHistoryDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.MyWageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 직원 본인용 시급 이력 API (E-NEW-02). 본인 전용 — principal.getId() 주체로만 조회.
 */
@EmployeeOrMaster
@RestController
@RequestMapping("/api/wage/my")
@RequiredArgsConstructor
@Tag(name = "내 시급 이력", description = "직원 본인 시급 변경 이력 조회 API")
public class MyWageController {

    private final MyWageService myWageService;

    @Operation(summary = "내 시급 이력 조회",
            description = "본인에게 적용되는 매장 기본/개별 시급 변경 이력을 적용일 내림차순으로 반환합니다.")
    @GetMapping("/history")
    public ResponseEntity<MyWageHistoryDto> getMyWageHistory(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new IllegalStateException("로그인이 필요해요.");
        }
        return ResponseEntity.ok(myWageService.getMyWageHistory(principal.getId()));
    }
}
