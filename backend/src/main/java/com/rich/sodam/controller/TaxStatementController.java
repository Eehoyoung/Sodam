package com.rich.sodam.controller;

import com.rich.sodam.dto.response.HeadcountTrendResponse;
import com.rich.sodam.dto.response.VatDeadlineResponse;
import com.rich.sodam.dto.response.WithholdingMonthlyResponse;
import com.rich.sodam.dto.response.WithholdingStatementResponse;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.EmploymentCreditService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.WithholdingMonthlyService;
import com.rich.sodam.service.WithholdingStatementService;
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
 * 세무 자료 (A2) — 간이지급명세서 인별 연간 집계. 사장 전용.
 *
 * <p>자료정리까지만(신고·제출 X, 홈택스 위임). 주민번호 미저장. 면책 동반.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/tax")
@RequiredArgsConstructor
@Tag(name = "세무 자료", description = "간이지급명세서 인별 연간 집계 (사장)")
public class TaxStatementController {

    private final WithholdingStatementService withholdingStatementService;
    private final WithholdingMonthlyService withholdingMonthlyService;
    private final EmploymentCreditService employmentCreditService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "간이지급명세서 자료", description = "그 해 인별 지급총액·원천징수세액 집계(참고용·세무사 검토 전).")
    @RequirePlan(min = PlanType.PRO) // PRO 세무 우대 SW(자료 집계 참고용 — 신고·대행 아님)
    @GetMapping("/withholding-statement")
    public ResponseEntity<WithholdingStatementResponse> withholdingStatement(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(withholdingStatementService.forYear(storeId, year));
    }

    @Operation(summary = "원천세 월 신고 요약", description = "그 달 원천징수세액 합 + 익월 10일 신고기한·D-day(참고용·세무사 검토 전).")
    @RequirePlan(min = PlanType.PRO)
    @GetMapping("/withholding-monthly")
    public ResponseEntity<WithholdingMonthlyResponse> withholdingMonthly(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year,
            @RequestParam int month) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(withholdingMonthlyService.monthlySummary(storeId, year, month));
    }

    @Operation(summary = "부가세 분기 신고기한 안내", description = "다가오는 일반과세 분기 기한·D-day(금액 없이 기한 알림만, 매출 미접촉).")
    @RequirePlan(min = PlanType.PRO)
    @GetMapping("/vat-deadline")
    public ResponseEntity<VatDeadlineResponse> vatDeadline(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(withholdingMonthlyService.upcomingVatDeadline(storeId));
    }

    @Operation(summary = "상시근로자 월별 추이(고용세액공제 신호)",
            description = "출근 데이터로 월별 상시근로자 수 + 전년 대비 증감(고용 증가 공제 가능 신호). 추정·세무사 검토 전.")
    @RequirePlan(min = PlanType.PRO)
    @GetMapping("/headcount-trend")
    public ResponseEntity<HeadcountTrendResponse> headcountTrend(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(employmentCreditService.headcountTrend(storeId, year));
    }
}
