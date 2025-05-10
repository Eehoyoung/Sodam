package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.GeocodingResult;
import com.rich.sodam.dto.LocationUpdateDto;
import com.rich.sodam.dto.StoreRegistrationDto;
import com.rich.sodam.service.GeocodingService;
import com.rich.sodam.service.StoreManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
public class StoreController {

    private final StoreManagementService storeManagementService; // 인터페이스로 교체
    private final GeocodingService geocodingService;

    // 매장 등록 (사용자를 사장으로 변환)
    @PostMapping
    public ResponseEntity<Store> registerStore(
            @RequestParam Long userId,
            @RequestBody StoreRegistrationDto storeDto) {

        // 주소 좌표 변환
        if (storeDto.getFullAddress() != null) {
            GeocodingResult geocoding = geocodingService.getCoordinates(storeDto.getFullAddress());

            // DTO에 좌표 정보 설정
            storeDto.setLatitude(geocoding.getLatitude());
            storeDto.setLongitude(geocoding.getLongitude());
            storeDto.setRoadAddress(geocoding.getRoadAddress());
            storeDto.setJibunAddress(geocoding.getJibunAddress());
        }

        // 기본 반경 설정 (100m)
        if (storeDto.getRadius() == null) {
            storeDto.setRadius(100);
        }

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

    // 매장 위치 정보 업데이트 엔드포인트
    @PutMapping("/{storeId}/location")
    public ResponseEntity<Store> updateStoreLocation(
            @PathVariable Long storeId,
            @RequestBody LocationUpdateDto locationDto) {

        // 주소가 변경된 경우 좌표 정보 갱신
        if (locationDto.getFullAddress() != null) {
            GeocodingResult geocoding = geocodingService.getCoordinates(locationDto.getFullAddress());
            locationDto.setLatitude(geocoding.getLatitude());
            locationDto.setLongitude(geocoding.getLongitude());
        }

        Store store = storeManagementService.updateStoreLocation(storeId, locationDto);
        return ResponseEntity.ok(store);
    }
}