package com.rich.sodam.controller;

import com.rich.sodam.domain.Store;
import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.LocationUpdateDto;
import com.rich.sodam.dto.request.StoreRegistrationDto;
import com.rich.sodam.dto.request.StoreUpdateDto;
import com.rich.sodam.dto.response.GeocodingResult;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.service.GeocodingService;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.StoreManagementServiceImpl;
import com.rich.sodam.service.StoreQueryService;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.MasterOnly;

import java.util.List;

@MasterOnly
@RestController
@RequestMapping("/api/stores")
@RequiredArgsConstructor
@Tag(name = "매장 관리", description = "매장 정보 및 직원 관리 API")
public class StoreController {

    private final StoreManagementServiceImpl storeManagementService;
    private final GeocodingService geocodingService;
    private final StoreQueryService storeQueryService;
    private final StoreAccessGuard storeAccessGuard;

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
            @Parameter(description = "사용자 ID (옵션) - 미지정 시 현재 인증 사용자로 처리") @RequestParam(required = false) Long userId,
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
        Long resolvedUserId = userId != null ? userId : getCurrentUserId();
        Store store = storeManagementService.registerStoreWithMaster(resolvedUserId, storeDto);
        return ResponseEntity.ok(store);
    }

    /*    @PostMapping("/change/master")
        public ResponseEntity<Store> registerStore(
                @Parameter(description = "사용자 ID", required = true) @RequestParam Long userId,
                @Parameter(description = "매장 등록 정보", required = true) @Valid @RequestBody StoreRegistrationDto storeDto) {

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

    @Operation(summary = "직원 메모 조회/수정 (사장만)",
            description = "사장이 특정 직원에 대해 작성하는 비공개 메모. 직원에게는 노출되지 않습니다.")
    @PutMapping("/{storeId}/employees/{employeeId}/memo")
    public ResponseEntity<java.util.Map<String, String>> updateEmployeeMemo(
            @PathVariable Long storeId,
            @PathVariable Long employeeId,
            @Valid @RequestBody java.util.Map<String, String> body) {
        String memo = body.getOrDefault("memo", "");
        storeManagementService.updateOwnerMemo(storeId, employeeId, memo);
        return ResponseEntity.ok(java.util.Map.of("memo", memo));
    }

    @GetMapping("/{storeId}/employees/{employeeId}/memo")
    public ResponseEntity<java.util.Map<String, String>> getEmployeeMemo(
            @PathVariable Long storeId,
            @PathVariable Long employeeId) {
        String memo = storeManagementService.getOwnerMemo(storeId, employeeId);
        return ResponseEntity.ok(java.util.Map.of("memo", memo == null ? "" : memo));
    }

    @Operation(summary = "매장 코드로 가입 (직원 셀프)",
            description = "사장이 공유한 매장 코드로 직원 본인이 매장에 가입. PRD_EMPLOYEE E-301.")
    @PostMapping("/join-by-code")
    public ResponseEntity<Store> joinByCode(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @Valid @RequestBody com.rich.sodam.dto.request.JoinStoreByCodeRequest req) {
        Store store = storeManagementService.joinStoreByCode(principal.getId(), req.getStoreCode());
        return ResponseEntity.ok(store);
    }

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
    @GetMapping("/master/{userIdOrCurrent}")
    public ResponseEntity<List<Store>> getStoresByMaster(
            @Parameter(description = "사용자 ID (사장) 또는 'current'", required = true) @PathVariable String userIdOrCurrent) {
        Long resolved = resolveUserId(userIdOrCurrent);
        List<Store> stores = storeManagementService.getStoresByMaster(resolved);
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

        storeAccessGuard.assertMasterOwnsStore(getCurrentUserId(), storeId); // 자기 매장만 수정

        // 주소가 변경된 경우 좌표 정보 갱신
        if (locationDto.getFullAddress() != null) {
            GeocodingResult geocoding = geocodingService.getCoordinates(locationDto.getFullAddress());
            locationDto.setLatitude(geocoding.getLatitude());
            locationDto.setLongitude(geocoding.getLongitude());
        }

        Store store = storeManagementService.updateStoreLocation(storeId, locationDto);
        return ResponseEntity.ok(store);
    }

    @Operation(summary = "매장 단건 조회", description = "ID로 활성 매장 정보를 조회합니다. 자기 매장만 조회 가능합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<Store> getStoreById(@PathVariable Long id) {
        storeAccessGuard.assertMasterOwnsStore(getCurrentUserId(), id); // 타 매장 정보 조회 차단
        return storeQueryService.findActiveById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "매장 일반 정보 업데이트", description = "매장명/전화번호/업종/주소/반경/기준시급 등의 일반 정보를 업데이트합니다.")
    @PutMapping("/{storeId}")
    public ResponseEntity<Store> updateStore(
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "업데이트 정보", required = true) @Valid @RequestBody StoreUpdateDto updateDto) {
        storeAccessGuard.assertMasterOwnsStore(getCurrentUserId(), storeId); // 자기 매장만 수정
        Store updated = storeManagementService.updateStore(storeId, updateDto);
        return ResponseEntity.ok(updated);
    }

    @Operation(summary = "매장 삭제", description = "매장을 소프트 삭제합니다.")
    @DeleteMapping("/{storeId}")
    public ResponseEntity<Void> deleteStore(@PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(getCurrentUserId(), storeId); // 자기 매장만 삭제
        storeManagementService.deleteStore(storeId);
        return ResponseEntity.noContent().build();
    }

    // ===== 내부 유틸 메서드 =====
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal)) {
            throw new IllegalStateException("인증 정보가 없습니다. 로그인이 필요합니다.");
        }
        return ((UserPrincipal) authentication.getPrincipal()).getId();
    }

    private Long resolveUserId(String userIdOrCurrent) {
        if ("current".equalsIgnoreCase(userIdOrCurrent)) {
            return getCurrentUserId();
        }
        try {
            return Long.parseLong(userIdOrCurrent);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("userId 경로 변수는 숫자 또는 'current'여야 합니다.");
        }
    }
}
