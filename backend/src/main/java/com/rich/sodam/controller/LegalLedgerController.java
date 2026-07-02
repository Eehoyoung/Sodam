package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.response.EmployeeRosterResponse;
import com.rich.sodam.dto.response.WageLedgerResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.LegalLedgerService;
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
 * 법정 장부 자료 (B8/L-NEW-03) — 임금대장(§48①)·근로자명부(§41). 사장 전용.
 *
 * <p>근로감독·체불진정 1순위 요구 서류. 자료정리까지만(법정 서식 보완은 사장 몫). 주민번호 미저장. 면책 동반.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/ledger")
@RequiredArgsConstructor
@Tag(name = "법정 장부", description = "임금대장·근로자명부 자료 (사장)")
public class LegalLedgerController {

    private final LegalLedgerService legalLedgerService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "임금대장 자료",
            description = "그 달 직원별 기본·연장·야간·휴일·주휴·총액·공제·실수령 집계(참고용·법정 서식 보완 필요).")
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.E_CONTRACT) // 임금대장 법정보관 = PRO 문서보관
    @GetMapping("/wage")
    public ResponseEntity<WageLedgerResponse> wageLedger(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year,
            @RequestParam int month) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(legalLedgerService.wageLedger(storeId, year, month));
    }

    @Operation(summary = "근로자명부 자료",
            description = "매장 직원별 이름·입사일·시급·재직상태(참고용·법정 서식 보완 필요·주민번호 미저장).")
    @RequirePlan(min = PlanType.PRO, features = PlanFeature.E_CONTRACT) // 근로자명부 법정보관 = PRO 문서보관
    @GetMapping("/roster")
    public ResponseEntity<EmployeeRosterResponse> employeeRoster(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(legalLedgerService.employeeRoster(storeId));
    }
}
