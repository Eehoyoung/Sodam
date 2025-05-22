package com.rich.sodam.controller;

import com.rich.sodam.dto.EmployeeWageInfoDto;
import com.rich.sodam.service.PayrollService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

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
}