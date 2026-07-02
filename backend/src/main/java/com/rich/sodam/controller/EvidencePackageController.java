package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanFeature;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.response.EvidencePackageResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.EvidencePackageService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * 근무 증거 패키지 (L-NEW-05) — 임금체불 진정 대비 셀프 증거 묶음. 사장 전용.
 *
 * <p>한 직원의 근태·급여·계약·시급이력을 한 번에 묶어 보여준다(집계만, 신규 데이터 X).
 * 주민번호 미저장·미노출(이름·내부ID까지만). 면책 동반.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/employees/{employeeId}/evidence")
@RequiredArgsConstructor
@Tag(name = "근무 증거 패키지", description = "직원 근태·급여·계약·시급이력 통합 집계 (사장)")
public class EvidencePackageController {

    private final EvidencePackageService evidencePackageService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "근무 증거 패키지 집계",
            description = "기간 내 근태요약·급여요약·계약요약·시급이력을 한 묶음으로 반환(참고용·법적 제출 전 보완 필요).")
    @RequirePlan(min = PlanType.PREMIUM, features = PlanFeature.INSPECTION_EVIDENCE)
    @GetMapping
    public ResponseEntity<EvidencePackageResponse> evidence(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(evidencePackageService.forEmployee(storeId, employeeId, from, to));
    }
}
