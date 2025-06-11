package com.rich.sodam.controller;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.PayrollDetail;
import com.rich.sodam.dto.request.PayrollCalculationRequestDto;
import com.rich.sodam.dto.request.PayrollStatusUpdateDto;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.dto.response.PayrollDetailDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.service.PayrollService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payroll")
@RequiredArgsConstructor
@Tag(name = "급여 관리", description = "직원 급여 관리 API")
public class PayrollController {

    private final PayrollService payrollService;

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
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "계산 시작 일시 (ISO 형식)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @Parameter(description = "계산 종료 일시 (ISO 형식)", required = true)
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

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
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId) {

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
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "연도", required = true, example = "2025") @RequestParam int year,
            @Parameter(description = "월 (1-12)", required = true, example = "5") @RequestParam int month) {

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
    @PostMapping("/calculate")
    public ResponseEntity<PayrollDto> calculatePayroll(
            @Parameter(description = "급여 계산 요청 정보", required = true)
            @RequestBody @Valid PayrollCalculationRequestDto requestDto) {

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
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId,
            @Parameter(description = "상태 업데이트 정보", required = true)
            @RequestBody @Valid PayrollStatusUpdateDto updateDto) {

        Payroll payroll = payrollService.updatePayrollStatus(payrollId, updateDto.getStatus());
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
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "조회 시작일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate from,
            @Parameter(description = "조회 종료일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate to) {

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
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<PayrollDto>> getStorePayrolls(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "조회 시작일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate from,
            @Parameter(description = "조회 종료일 (YYYY-MM-DD)") @RequestParam(required = false) LocalDate to) {

        List<Payroll> payrolls = payrollService.getStorePayrolls(storeId, from, to);
        List<PayrollDto> dtos = payrolls.stream()
                .map(PayrollDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
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
            @Parameter(description = "급여 ID", required = true) @PathVariable Long payrollId) {
        List<PayrollDetail> details = payrollService.getPayrollDetails(payrollId);
        List<PayrollDetailDto> dtos = details.stream()
                .map(PayrollDetailDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}