package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.StoreRegistrationDto;
import com.rich.sodam.service.StoreManagementServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreManagementServiceImpl storeManagementService; // 구현체 대신 인터페이스 사용

    // 매장 등록 (사용자를 사장으로 변환)
    @PostMapping
    public ResponseEntity<Store> registerStore(
            @RequestParam Long userId,
            @RequestBody StoreRegistrationDto storeDto) {
        Store store = storeManagementService.registerStoreWithMaster(userId, storeDto);
        return ResponseEntity.ok(store);
    }

    // 매장에 사원 할당 (사용자를 사원으로 변환)
    @PostMapping("/{storeId}/employees")
    public ResponseEntity<Void> assignEmployeeToStore(
            @PathVariable Long storeId,
            @RequestParam Long userId) {
        storeManagementService.assignUserToStoreAsEmployee(userId, storeId);
        return ResponseEntity.ok().build();
    }

    // 사장이 관리하는 매장 목록 조회
    @GetMapping("/master/{userId}")
    public ResponseEntity<List<Store>> getStoresByMaster(@PathVariable Long userId) {
        List<Store> stores = storeManagementService.getStoresByMaster(userId);
        return ResponseEntity.ok(stores);
    }

    // 사원이 소속된 매장 목록 조회
    @GetMapping("/employee/{userId}")
    public ResponseEntity<List<Store>> getStoresByEmployee(@PathVariable Long userId) {
        List<Store> stores = storeManagementService.getStoresByEmployee(userId);
        return ResponseEntity.ok(stores);
    }

    // 매장에 소속된 사원 목록 조회
    @GetMapping("/{storeId}/employees")
    public ResponseEntity<List<User>> getEmployeesByStore(@PathVariable Long storeId) {
        List<User> employees = storeManagementService.getEmployeesByStore(storeId);
        return ResponseEntity.ok(employees);
    }
}