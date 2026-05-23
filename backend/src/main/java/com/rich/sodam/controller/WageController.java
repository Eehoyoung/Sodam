package com.rich.sodam.controller;

import com.rich.sodam.dto.request.EmployeeWageUpdateDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.StoreManagementServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@EmployeeOrMaster
@RestController
@RequestMapping("/api/wages")
@RequiredArgsConstructor
@Tag(name = "임금 관리", description = "직원 임금 관리 API")
public class WageController {

    private final StoreManagementServiceImpl storeManagementService;
    private final StoreAccessGuard guard;

    @Operation(summary = "직원 임금 업데이트", description = "특정 직원의 임금을 업데이트합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "업데이트 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @MasterOnly
    @PostMapping("/employee")
    public ResponseEntity<Void> updateEmployeeWage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 임금 업데이트 정보", required = true)
            @Valid @RequestBody EmployeeWageUpdateDto wageDto) {
        // 사장이 자기 매장에 소속된 직원의 시급만 변경 가능
        guard.assertMasterOwnsStore(principal.getId(), wageDto.getStoreId());
        guard.assertEmployeeInStore(wageDto.getEmployeeId(), wageDto.getStoreId());
        storeManagementService.updateEmployeeWage(wageDto);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "매장 기본 시급 업데이트", description = "매장의 기본 시급을 업데이트합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "업데이트 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "매장 정보를 찾을 수 없음")
    })
    @MasterOnly
    @PutMapping("/store/{storeId}/standard")
    public ResponseEntity<Void> updateStoreStandardWage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "기본 시급", required = true, example = "9860")
            @RequestParam Integer standardHourlyWage) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        storeManagementService.updateStoreStandardWage(storeId, standardHourlyWage);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "직원 매장별 임금 조회", description = "특정 직원의 특정 매장에서의 임금을 조회합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "조회 성공",
                    content = @Content(schema = @Schema(type = "integer", example = "10000"))),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @GetMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Integer> getEmployeeWageInStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId) {
        // 본인 시급 조회 OR 사장이 자기 매장 직원 시급 조회
        boolean isMaster = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MASTER")
                        || a.getAuthority().equals("ROLE_MANAGER")
                        || a.getAuthority().equals("ROLE_BOSS"));
        guard.assertCanViewEmployee(principal.getId(), employeeId, isMaster);
        if (isMaster) {
            guard.assertMasterOwnsStore(principal.getId(), storeId);
        }
        Integer wage = storeManagementService.getEmployeeWageInStore(employeeId, storeId);
        return ResponseEntity.ok(wage);
    }

    @Operation(summary = "직원 할당 및 임금 설정", description = "특정 직원을 매장에 할당하고 임금을 설정합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "할당 성공"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청"),
            @ApiResponse(responseCode = "401", description = "인증 실패"),
            @ApiResponse(responseCode = "404", description = "직원 또는 매장 정보를 찾을 수 없음")
    })
    @MasterOnly
    @PostMapping("/employee/{employeeId}/store/{storeId}")
    public ResponseEntity<Void> assignEmployeeToStoreWithWage(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "직원 ID", required = true) @PathVariable Long employeeId,
            @Parameter(description = "매장 ID", required = true) @PathVariable Long storeId,
            @Parameter(description = "사용자 지정 시급")
            @RequestParam(required = false) Integer customHourlyWage) {
        guard.assertMasterOwnsStore(principal.getId(), storeId);
        storeManagementService.assignUserToStoreAsEmployee(employeeId, storeId);
        return ResponseEntity.ok().build();
    }
}