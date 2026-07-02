package com.rich.sodam.controller;

import com.rich.sodam.dto.response.PayrollBoundaryAdvisoryResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.PayrollAdvisoryService;
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

/**
 * 주휴 월경계 정합성 알림 (L-NEW-06). 사장 전용.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/payroll")
@RequiredArgsConstructor
@Tag(name = "급여 정합성", description = "주휴 월경계 확인 알림")
public class PayrollAdvisoryController {

    private final PayrollAdvisoryService payrollAdvisoryService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "주휴 월경계 알림", description = "그 달 월 경계에 걸친 주(주휴 귀속 모호) 안내.")
    @GetMapping("/boundary-advisory")
    public ResponseEntity<PayrollBoundaryAdvisoryResponse> boundaryAdvisory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year,
            @RequestParam int month) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(payrollAdvisoryService.monthBoundaryWeeks(year, month));
    }
}
