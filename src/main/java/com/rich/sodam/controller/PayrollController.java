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

        int wage = payrollService.calculateEmployeeWage(employeeId, storeId, startDate, endDate);
        return ResponseEntity.ok(wage);
    }

    @GetMapping("/employee/{employeeId}/wages")
    public ResponseEntity<List<EmployeeWageInfoDto>> getEmployeeWageInfoInAllStores(
            @PathVariable Long employeeId) {

        List<EmployeeWageInfoDto> wageInfos = payrollService.getEmployeeWageInfoInAllStores(employeeId);
        return ResponseEntity.ok(wageInfos);
    }
}