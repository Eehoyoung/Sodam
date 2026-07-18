package com.rich.sodam.controller;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.PayrollDetail;
import com.rich.sodam.dto.request.PayrollCalculationRequestDto;
import com.rich.sodam.dto.request.PayrollStatusUpdateDto;
import com.rich.sodam.dto.request.PayrollIssueRequest;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.dto.response.PayrollDetailDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.PayrollService;
import com.rich.sodam.service.PayrollStoreBatchService;
import com.rich.sodam.service.PayrollHighRiskActionService;
import com.rich.sodam.service.StoreAccessGuard;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@EmployeeOrMaster
@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@Tag(name = "급여 관리", description = "직원 급여 관리 API")
public class PayrollController {

    private final PayrollService payrollService;
    private final PayrollStoreBatchService payrollStoreBatchService;
    private final StoreAccessGuard guard;
    private final PayrollHighRiskActionService payrollHighRiskActionService;

    private static boolean isMaster(UserPrincipal p) {
        if (p == null || p.getAuthorities() == null) return false;
        return p.getAuthorities().stream().anyMatch(a ->
                "ROLE_MASTER".equals(a.getAuthority()));
    }

    @Operation(summary = "직원 기간별 급여 계산", description = "특정 기간 동안의 직원 급여를 계산합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "계산 성공",
                    content = @Content(schema = @Schema(type = "integer", example = "150000"))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Integer> calculateEmployeeWage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "계산 시작 일시 (ISO 형식)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "계산 종료 일시 (ISO 형식)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        assertCanViewEmployeeInStore(principal, employeeId, storeId);
        int wage = payrollService.calculateWageForPeriod(employeeId, storeId, startDate, endDate);
        return ResponseEntity.ok(wage);
    }

    @Operation(summary = "직원 전체 매장 급여 정보 조회", description = "직원이 소속된 모든 매장의 급여 정보를 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = EmployeeWageInfoDto.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}/wages")
    public ResponseEntity<List<EmployeeWageInfoDto>> getEmployeeWageInfoInAllStores(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId) {
        guard.assertSelf(principal.getId(), employeeId);
        List<EmployeeWageInfoDto> wageInfos = payrollService.getEmployeeWageInfoInAllStores(employeeId);
        return ResponseEntity.ok(wageInfos);
    }

    @Operation(summary = "직원 월별 급여 계산", description = "특정 월의 직원 급여를 계산합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "계산 성공",
                    content = @Content(schema = @Schema(type = "integer", example = "1250000"))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}/store/{storeId}/monthly")
    public ResponseEntity<Integer> calculateMonthlyEmployeeWage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "연도", required = true, example = "2025") @RequestParam int year,
            @Parameter(description = "월 (1-12)", required = true, example = "5") @RequestParam int month) {
        assertCanViewEmployeeInStore(principal, employeeId, storeId);
        int wage = payrollService.calculateMonthlyWage(employeeId, storeId, year, month);
        return ResponseEntity.ok(wage);
    }

    @Operation(summary = "급여 계산 및 생성", description = "직원의 특정 기간 급여를 계산하고 급여 기록을 생성합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "급여 생성 성공",
                    content = @Content(schema = @Schema(implementation = PayrollDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @MasterOnly
    @PostMapping("/calculate")
    public ResponseEntity<?> calculatePayroll(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 계산 요청 정보", required = true)
            @Valid @RequestBody PayrollCalculationRequestDto requestDto) {
        guard.assertMasterOwnsStore(principal.getId(), requestDto.getStoreId());

        // 매장 일괄 계산 모드: employeeId 미지정 → 매장 활성 직원 전체
        if (requestDto.getEmployeeId() == null) {
            java.util.List<PayrollDto> all = payrollStoreBatchService.calculatePayrollForStore(
                    requestDto.getStoreId(),
                    requestDto.getStartDate(),
                    requestDto.getEndDate());
            return ResponseEntity.ok(all);
        }

        Payroll payroll = payrollService.calculatePayroll(
                requestDto.getEmployeeId(),
                requestDto.getStoreId(),
                requestDto.getStartDate(),
                requestDto.getEndDate());

        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    @Operation(summary = "급여 상태 업데이트", description = "급여의 상태를 업데이트합니다 (확정, 지급완료, 취소 등).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "상태 업데이트 성공",
                    content = @Content(schema = @Schema(implementation = PayrollDto.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @PutMapping("/{payrollId}/status")
    public ResponseEntity<PayrollDto> updatePayrollStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId,
            @Parameter(description = "상태 (query alt — FE 호환)")
                @RequestParam(value = "status", required = false)
                com.rich.sodam.domain.type.PayrollStatus statusQuery,
            @Parameter(description = "상태 업데이트 정보 (body alt)")
            @Valid @RequestBody(required = false) PayrollStatusUpdateDto updateDtoBody) {

        // FE 호환: query 또는 body 둘 중 하나로 받을 수 있음
        PayrollStatusUpdateDto updateDto = updateDtoBody;
        if (updateDto == null || updateDto.getStatus() == null) {
            if (statusQuery == null) {
                return ResponseEntity.badRequest().build();
            }
            updateDto = PayrollStatusUpdateDto.builder().status(statusQuery).build();
        }

        Payroll payroll = payrollHighRiskActionService.changeStatus(
                principal.getId(), payrollId, updateDto.getStatus(), updateDto.getPaymentDate(),
                updateDto.getCancelReason(), updateDto.getStepUpPassword());
        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    @Operation(summary = "급여 발급", description = "급여를 확정→지급완료로 원자 처리합니다 (정산 마법사 '발급').")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "발급 성공",
                    content = @Content(schema = @Schema(implementation = PayrollDto.class))),
            @ApiResponse(responseCode = "400", description = "발급 불가 상태(취소 등)"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @PutMapping("/{payrollId}/issue")
    public ResponseEntity<PayrollDto> issuePayroll(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId,
            @Valid @RequestBody PayrollIssueRequest request) {
        Payroll payroll = payrollHighRiskActionService.issue(
                principal.getId(), payrollId, request.stepUpPassword());
        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    @Operation(summary = "직원 급여 내역 조회", description = "특정 직원의 급여 내역을 기간별로 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PayrollDto.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<PayrollDto>> getEmployeePayrolls(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "조회 시작일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate from,
            @Parameter(description = "조회 종료일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate to) {
        guard.assertSelf(principal.getId(), employeeId);
        List<Payroll> payrolls = payrollService.getEmployeePayrolls(employeeId, from, to);
        List<PayrollDto> dtos = payrolls.stream()
                .map(PayrollDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "매장 급여 내역 조회", description = "특정 매장의 모든 직원 급여 내역을 기간별로 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PayrollDto.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @MasterOnly
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<PayrollDto>> getStorePayrolls(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "조회 시작일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate from,
            @Parameter(description = "조회 종료일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate to) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        List<Payroll> payrolls = payrollService.getStorePayrolls(storeId, from, to);
        List<PayrollDto> dtos = payrolls.stream()
                .map(PayrollDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "급여 단건 조회", description = "특정 급여의 요약 정보(실수령액·기간·상태)를 조회합니다. 상세 화면(SalaryDetailScreen)의 헤더 데이터 공급용 — /details 는 근무일별 배열만 반환하므로 별도 필요.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(implementation = PayrollDto.class))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @GetMapping("/{payrollId}")
    public ResponseEntity<PayrollDto> getPayroll(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId) {
        // IDOR 차단: 본인 급여 또는 그 직원의 매장 사장만. (임의 payrollId 로 타인 급여 열람 방지)
        Payroll payroll = payrollService.getPayrollById(payrollId);
        assertCanViewPayroll(principal, payroll);
        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    @Operation(summary = "급여 상세 내역 조회", description = "특정 급여의 상세 내역을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = PayrollDetailDto.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @GetMapping("/{payrollId}/details")
    public ResponseEntity<List<PayrollDetailDto>> getPayrollDetails(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId) {
        // IDOR 차단: 본인 급여 또는 그 직원의 매장 사장만. (임의 payrollId 로 타인 명세 열람 방지)
        Payroll payroll = payrollService.getPayrollById(payrollId);
        assertCanViewPayroll(principal, payroll);
        List<PayrollDetail> details = payrollService.getPayrollDetails(payrollId);
        List<PayrollDetailDto> dtos = details.stream()
                .map(PayrollDetailDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @Operation(summary = "급여명세서 PDF 생성", description = "특정 급여의 PDF 명세서를 생성합니다. (HIGH-BE-002)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "PDF 생성 성공",
                    content = @Content(mediaType = "application/pdf")),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "급여 정보를 찾을 수 없음")
    })
    @GetMapping("/{payrollId}/pdf")
    public ResponseEntity<byte[]> generatePayrollPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId) {
        // IDOR 차단: 본인 급여 또는 그 직원의 매장 사장만. (임의 payrollId 로 타인 명세서 PDF 열람 방지)
        Payroll payrollForAuth = payrollService.getPayrollById(payrollId);
        assertCanViewPayroll(principal, payrollForAuth);

        byte[] pdfBytes = payrollService.generatePayrollPdf(payrollId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "payroll_" + payrollId + ".pdf");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    private void assertCanViewEmployeeInStore(UserPrincipal principal, Long employeeId, Long storeId) {
        if (isMaster(principal)) {
            guard.assertMasterOwnsStore(principal.getId(), storeId);
        } else {
            guard.assertSelf(principal.getId(), employeeId);
        }
        guard.assertEmployeeInStore(employeeId, storeId);
    }

    private void assertCanViewPayroll(UserPrincipal principal, Payroll payroll) {
        if (isMaster(principal)) {
            guard.assertMasterOwnsStore(principal.getId(), payroll.getStore().getId());
        } else {
            guard.assertSelf(principal.getId(), payroll.getEmployee().getId());
        }
    }
}
