package com.rich.sodam.controller;

import com.rich.sodam.domain.type.PlanType;
import com.rich.sodam.dto.request.TaxAccountantEmailUpdateDto;
import com.rich.sodam.dto.response.TaxReportSendLogDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.annotation.RequirePlan;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.TaxReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 세무사 송부 (인건비 내역서) — 사장 전용.
 *
 * 퍼널: 세무사 이메일 등록 → 정산기간 인건비 내역서 미리보기(PDF) → 발송 → 이력 확인.
 * 확정(CONFIRMED)·지급완료(PAID) 급여만 포함 — 발송 자체가 세전 신고자료 전달이므로
 * 작성중 급여가 섞여 나가면 안 된다.
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/tax-reports")
@RequiredArgsConstructor
@Tag(name = "세무사 송부", description = "인건비 내역서 생성·이메일 발송·이력")
public class TaxReportController {

    private final TaxReportService taxReportService;
    private final StoreAccessGuard storeAccessGuard;

    @Operation(summary = "인건비 내역서 PDF 미리보기",
            description = "발송 전 사장 검토용. 확정·지급완료 급여의 직원별 세전/공제/실지급 집계.")
    @RequirePlan(min = PlanType.PRO) // 세무 자료 내보내기 = PRO 비즈니스 기능 (ExportController CSV 와 동일 기준)
    @GetMapping("/preview.pdf")
    public ResponseEntity<byte[]> previewLaborCostSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        // BOLA 차단: 본인 소유 매장만 (가드는 try 밖 — 프로젝트 보안 패턴)
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        byte[] pdf = taxReportService.generateLaborCostSummaryPdf(storeId, from, to);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment",
                String.format("labor_cost_%d_%s_%s.pdf", storeId, from, to));
        return ResponseEntity.ok().headers(headers).body(pdf);
    }

    @Operation(summary = "세무사에게 인건비 내역서 발송",
            description = "매장에 등록된 세무사 이메일로 PDF(직원별 집계)+CSV(건별 상세)를 발송하고 이력을 남깁니다. "
                    + "같은 기간 재발송은 force=true 필요(409 TAX_REPORT_ALREADY_SENT).")
    @RequirePlan(min = PlanType.PRO)
    @PostMapping("/send")
    public ResponseEntity<TaxReportSendLogDto> sendToAccountant(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "false") boolean force) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        var sendLog = taxReportService.sendToAccountant(principal.getId(), storeId, from, to, force);
        return ResponseEntity.status(201).body(TaxReportSendLogDto.from(sendLog));
    }

    @Operation(summary = "발송 이력 조회")
    @GetMapping("/history")
    public ResponseEntity<List<TaxReportSendLogDto>> getHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        List<TaxReportSendLogDto> history = taxReportService.getSendHistory(storeId).stream()
                .map(TaxReportSendLogDto::from)
                .toList();
        return ResponseEntity.ok(history);
    }

    @Operation(summary = "세무사 이메일 등록/수정", description = "빈 값이면 등록 해제.")
    @PutMapping("/accountant-email")
    public ResponseEntity<Void> updateAccountantEmail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody TaxAccountantEmailUpdateDto request) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        taxReportService.updateAccountantEmail(storeId, request.getEmail());
        return ResponseEntity.noContent().build();
    }
}
