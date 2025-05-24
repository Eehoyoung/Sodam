package com.rich.sodam.controller;

import com.rich.sodam.domain.Payroll;
import com.rich.sodam.domain.PayrollDetail;
import com.rich.sodam.dto.request.PayrollCalculationRequestDto;
import com.rich.sodam.dto.request.PayrollStatusUpdateDto;
import com.rich.sodam.dto.response.EmployeeWageInfoDto;
import com.rich.sodam.dto.response.PayrollDetailDto;
import com.rich.sodam.dto.response.PayrollDto;
import com.rich.sodam.service.PayrollService;
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
public class PayrollController {

    private final PayrollService payrollService;

    @GetMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Integer> calculateEmployeeWage(
            @PathVariable Long employeeId,
            @PathVariable Long storeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        // 메소드명을 더 명확하게 변경하고, 필요한 파라미터만 전달
        int wage = payrollService.calculateWageForPeriod(employeeId, storeId, startDate, endDate);
        return ResponseEntity.ok(wage);
    }

    @GetMapping("/employee/{employeeId}/wages")
    public ResponseEntity<List<EmployeeWageInfoDto>> getEmployeeWageInfoInAllStores(
            @PathVariable Long employeeId) {

        List<EmployeeWageInfoDto> wageInfos = payrollService.getEmployeeWageInfoInAllStores(employeeId);
        return ResponseEntity.ok(wageInfos);
    }

    // 월별 급여 계산을 위한 새로운 엔드포인트 추가
    @GetMapping("/employee/{employeeId}/store/{storeId}/monthly")
    public ResponseEntity<Integer> calculateMonthlyEmployeeWage(
            @PathVariable Long employeeId,
            @PathVariable Long storeId,
            @RequestParam int year,
            @RequestParam int month) {

        // DateTimeUtils를 활용하는 월별 급여 계산 메소드 호출
        int wage = payrollService.calculateMonthlyWage(employeeId, storeId, year, month);
        return ResponseEntity.ok(wage);
    }

    /**
     * 직원의 특정 기간 급여 계산 및 조회
     */
    @PostMapping("/calculate")
    public ResponseEntity<PayrollDto> calculatePayroll(
            @RequestBody @Valid PayrollCalculationRequestDto requestDto) {

        Payroll payroll = payrollService.calculatePayroll(
                requestDto.getEmployeeId(),
                requestDto.getStoreId(),
                requestDto.getStartDate(),
                requestDto.getEndDate());

        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    /**
     * 급여 상태 업데이트 (확정, 지급완료, 취소)
     */
    @PutMapping("/{payrollId}/status")
    public ResponseEntity<PayrollDto> updatePayrollStatus(
            @PathVariable Long payrollId,
            @RequestBody @Valid PayrollStatusUpdateDto updateDto) {

        Payroll payroll = payrollService.updatePayrollStatus(payrollId, updateDto.getStatus());
        return ResponseEntity.ok(PayrollDto.from(payroll));
    }

    /**
     * 직원의 급여 내역 조회
     */
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<PayrollDto>> getEmployeePayrolls(
            @PathVariable Long employeeId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {

        List<Payroll> payrolls = payrollService.getEmployeePayrolls(employeeId, from, to);
        List<PayrollDto> dtos = payrolls.stream()
                .map(PayrollDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * 매장의 급여 내역 조회
     */
    @GetMapping("/store/{storeId}")
    public ResponseEntity<List<PayrollDto>> getStorePayrolls(
            @PathVariable Long storeId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {

        List<Payroll> payrolls = payrollService.getStorePayrolls(storeId, from, to);
        List<PayrollDto> dtos = payrolls.stream()
                .map(PayrollDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    /**
     * 급여 상세 내역 조회
     */
    @GetMapping("/{payrollId}/details")
    public ResponseEntity<List<PayrollDetailDto>> getPayrollDetails(@PathVariable Long payrollId) {
        List<PayrollDetail> details = payrollService.getPayrollDetails(payrollId);
        List<PayrollDetailDto> dtos = details.stream()
                .map(PayrollDetailDto::from)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

}