package com.rich.sodam.controller;

import com.rich.sodam.dto.response.OvertimeCheckResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.OvertimeLimitService;
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
 * 연장근로 한도(주 52h, §53) 실시간 경보 (B5/L-NEW-02). 사장 전용.
 *
 * <p>출근 기록 기준 직원별·주별 실근로시간을 합산해 52h 초과 주를 경보한다.
 * 위반 시 형사처벌(§110) 대상이라 명세서 발급 전 사장이 인지하도록 한다. 추정·노무사 검토 전.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}")
@RequiredArgsConstructor
@Tag(name = "연장근로 한도 경보", description = "주 52시간(§53) 초과 주 경보 (사장)")
public class OvertimeLimitController {

    private final OvertimeLimitService overtimeLimitService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "연장근로 한도(주 52h) 점검",
            description = "해당 월의 직원별·주별 실근로시간 합계로 주 52시간(소정40+연장12, §53) 초과 주를 추출(추정·노무사 검토 전).")
    @GetMapping("/overtime-check")
    public ResponseEntity<OvertimeCheckResponse> overtimeCheck(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam int year,
            @RequestParam int month) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(overtimeLimitService.checkYearMonth(storeId, year, month));
    }
}
