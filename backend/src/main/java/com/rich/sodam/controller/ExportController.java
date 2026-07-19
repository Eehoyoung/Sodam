package com.rich.sodam.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.ExportService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/**
 * 출퇴근/급여 CSV 내보내기 (PRD_OWNER A35·A45 · A-부가).
 *
 * 한국어 CSV: UTF-8 BOM 포함 (Excel 호환).
 */
@MasterOnly
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Tag(name = "데이터 내보내기", description = "CSV 다운로드")
public class ExportController {

    private final ExportService exportService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "매장 출퇴근 기록 CSV",
            description = "지정 기간의 매장 출퇴근 기록을 CSV 로 내보냅니다. Excel 호환 UTF-8 BOM 포함.")
    @RequirePlan(min = PlanType.PRO) // CSV 내보내기 = PRO 비즈니스 기능
    @GetMapping("/attendance/store/{storeId}.csv")
    public ResponseEntity<byte[]> exportAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // BOLA 차단: 본인 소유 매장만 CSV 내보내기(타 매장 PII·급여 덤프 방지)
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        String csv = exportService.buildAttendanceCsv(storeId, from, to);

        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=utf-8"));
        headers.setContentDispositionFormData("attachment",
                String.format("attendance_store_%d_%s_%s.csv", storeId, from, to));
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    @Operation(summary = "매장 급여 명세 CSV",
            description = "지정 기간의 매장 발급 급여 명세를 CSV 로 내보냅니다.")
    @RequirePlan(min = PlanType.PRO) // CSV 내보내기 = PRO 비즈니스 기능
    @GetMapping("/payroll/store/{storeId}.csv")
    public ResponseEntity<byte[]> exportPayroll(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // BOLA 차단: 본인 소유 매장만 급여 CSV 내보내기
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        String csv = exportService.buildPayrollCsv(storeId, from, to);

        byte[] bytes = csv.getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=utf-8"));
        headers.setContentDispositionFormData("attachment",
                String.format("payroll_store_%d_%s_%s.csv", storeId, from, to));
        return ResponseEntity.ok().headers(headers).body(bytes);
    }
}
