package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.response.GeocodingResult;
import com.rich.sodam.service.GeocodingService;
import com.rich.sodam.service.StoreManagementServiceImpl;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
@Tag(name = "매장 관리", description = "매장 정보 및 직원 관리 API")
public class StoreController {

    private final StoreManagementServiceImpl storeManagementService;
    private final GeocodingService geocodingService;

    @Operation(summary = "매장 등록", description = "새로운 매장을 등록하고 사용자를 해당 매장의 사장으로 지정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "매장 등록 성공",
                    content = @Content(schema = @Schema(implementation = Store.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "사용자 정보를 찾을 수 없음")
    })

    @PostMapping("/registration")
    public ResponseEntity<Store> registerStore(
            @Parameter(description = "사용자 ID", required = true) @RequestParam Long userId,
            @Parameter(description = "매장 등록 정보", required = true) @Valid @RequestBody StoreRegistrationDto storeDto) {

        if (storeDto.getQuery() != null) {
            GeocodingResult geocoding = geocodingService.getCoordinates(storeDto.getQuery());
            storeDto.setLatitude(geocoding.getLatitude());
            storeDto.setLongitude(geocoding.getLongitude());
            storeDto.setRoadAddress(geocoding.getRoadAddress());
            storeDto.setJibunAddress(geocoding.getJibunAddress());
        }
        if (storeDto.getRadius() == null) {
            storeDto.setRadius(100);
        }
        Store store = storeManagementService.registerStoreWithMaster(userId, storeDto);
        return ResponseEntity.ok(store);
    }

    /*    @PostMapping("/change/master")
        public ResponseEntity<Store> registerStore(
                @Parameter(description = "사용자 ID", required = true) @RequestParam Long userId,
                @Parameter(description = "매장 등록 정보", required = true) @RequestBody StoreRegistrationDto storeDto) {

            // 주소 좌표 변환
            if (storeDto.getQuery() != null) {
                GeocodingResult geocoding = geocodingService.getCoordinates(storeDto.getQuery());

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
    */
    @Operation(summary = "매장에 직원 할당", description = "사용자를 특정 매장의 직원으로 할당합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "직원 할당 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "사용자 또는 매장 정보를 찾을 수 없음")
    })
    @PostMapping("/{storeId}/employees")
    public ResponseEntity<Void> assignEmployeeToStore(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "사용자 ID", required = true) @RequestParam Long userId,
            @Parameter(description = "사용자 지정 시급") @RequestParam(required = false) Integer customHourlyWage) {
        storeManagementService.assignUserToStoreAsEmployee(userId, storeId, customHourlyWage);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "사장의 매장 목록 조회", description = "특정 사용자(사장)가 관리하는 모든 매장 목록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = Store.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "사용자 정보를 찾을 수 없음")
    })
    @GetMapping("/master/{userId}")
    public ResponseEntity<List<Store>> getStoresByMaster(
            @Parameter(description = "사용자 ID (사장)", required = true) @PathVariable Long userId) {
        List<Store> stores = storeManagementService.getStoresByMaster(userId);
        return ResponseEntity.ok(stores);
    }

    @Operation(summary = "직원의 매장 목록 조회", description = "특정 사용자(직원)가 소속된 모든 매장 목록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = Store.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "사용자 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{userId}")
    public ResponseEntity<List<Store>> getStoresByEmployee(
            @Parameter(description = "사용자 ID (직원)", required = true) @PathVariable Long userId) {
        List<Store> stores = storeManagementService.getStoresByEmployee(userId);
        return ResponseEntity.ok(stores);
    }

    @Operation(summary = "매장 직원 목록 조회", description = "특정 매장에 소속된 모든 직원 목록을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = User.class)))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @GetMapping("/{storeId}/employees")
    public ResponseEntity<List<User>> getEmployeesByStore(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId) {
        List<User> employees = storeManagementService.getEmployeesByStore(storeId);
        return ResponseEntity.ok(employees);
    }

    @Operation(summary = "매장 위치 정보 업데이트", description = "매장의 위치 정보(주소, 좌표, 반경 등)를 업데이트합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "업데이트 성공",
                    content = @Content(schema = @Schema(implementation = Store.class))),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @PutMapping("/{storeId}/location")
    public ResponseEntity<Store> updateStoreLocation(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "위치 업데이트 정보", required = true) @Valid @RequestBody LocationUpdateDto locationDto) {

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
