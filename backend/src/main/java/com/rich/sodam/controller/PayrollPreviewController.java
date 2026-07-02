package com.rich.sodam.controller;

import com.rich.sodam.dto.response.PayrollPreviewResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.domain.type.DomainEventType;
import com.rich.sodam.service.DomainEventService;
import com.rich.sodam.service.PayrollPreviewService;
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
 * 급여 미리보기 (D0 aha, A1). 매장 등록 직후 "사장님 시급은?" → 즉시 주휴 포함 예상급여.
 *
 * <p>영속화 없음(사장을 직원으로 등록하지 않음). 자기 매장 사장만 접근.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/payroll-preview")
@RequiredArgsConstructor
@Tag(name = "급여 미리보기", description = "시급·주근로시간 → 주휴 포함 월 예상급여 (D0 aha)")
public class PayrollPreviewController {

    private final PayrollPreviewService payrollPreviewService;
    private final StoreAccessGuard storeAccessGuard;
    private final DomainEventService domainEventService;

    @Operation(summary = "급여 미리보기", description = "시급·주 근로시간으로 주휴 포함 월 예상급여를 계산. 추정치(면책 동반).")
    @GetMapping
    public ResponseEntity<PayrollPreviewResponse> preview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int hourlyWage,
            @RequestParam double weeklyHours) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        PayrollPreviewResponse preview = payrollPreviewService.preview(hourlyWage, weeklyHours);
        domainEventService.record(DomainEventType.PAYROLL_PREVIEW_VIEWED,
                principal.getId(), storeId, "weeklyHours=" + weeklyHours);
        return ResponseEntity.ok(preview);
    }
}
