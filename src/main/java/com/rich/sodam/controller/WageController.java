package com.rich.sodam.controller;

import com.rich.sodam.dto.EmployeeWageUpdateDto;
import com.rich.sodam.service.StoreManagementServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wages")
@RequiredArgsConstructor
public class WageController {

    private final StoreManagementServiceImpl storeManagementService;

    @PostMapping("/employee")
    public ResponseEntity<Void> updateEmployeeWage(@RequestBody EmployeeWageUpdateDto wageDto) {
        storeManagementService.updateEmployeeWage(wageDto);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/store/{storeId}/standard")
    public ResponseEntity<Void> updateStoreStandardWage(
            @PathVariable Long storeId,
            @RequestParam Integer standardHourlyWage) {
        storeManagementService.updateStoreStandardWage(storeId, standardHourlyWage);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Integer> getEmployeeWageInStore(
            @PathVariable Long employeeId,
            @PathVariable Long storeId) {
        Integer wage = storeManagementService.getEmployeeWageInStore(employeeId, storeId);
        return ResponseEntity.ok(wage);
    }

    @PostMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Void> assignEmployeeToStoreWithWage(
            @PathVariable Long employeeId,
            @PathVariable Long storeId,
            @RequestParam(required = false) Integer customHourlyWage) {
        storeManagementService.assignUserToStoreAsEmployee(employeeId, storeId);
        return ResponseEntity.ok().build();
    }
}