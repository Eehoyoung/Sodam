package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 사용자 관리 컨트롤러
 * 사용자 정보 조회, 역할 변경 등의 기능을 제공합니다.
 */
@RestController
@RequestMapping("/api/user")
@Tag(name = "사용자 관리", description = "사용자 정보 조회 및 관리 API")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 사업주 전환 API
     * AUTH-008: 일반 사용자를 사업주로 전환합니다.
     *
     * @param userId 전환할 사용자 ID
     * @return 전환된 사용자 정보
     */
    @PostMapping("/{userId}/convert-to-owner")
    @Operation(
            summary = "사업주 전환",
            description = "일반 사용자를 사업주(MASTER)로 전환합니다. 이미 사업주이거나 일반 사용자가 아닌 경우 오류를 반환합니다."
    )
    public ResponseEntity<ApiResponse<User>> convertToOwner(
            @Parameter(description = "전환할 사용자 ID", required = true)
            @PathVariable Long userId) {

        try {
            User convertedUser = userService.convertToOwner(userId);

            ApiResponse<User> response = ApiResponse.success("사업주 전환이 완료되었습니다.", convertedUser);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            ApiResponse<User> response = ApiResponse.error("INVALID_REQUEST", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            ApiResponse<User> response = ApiResponse.error("INTERNAL_ERROR", "사업주 전환 중 오류가 발생했습니다.");

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 사용자 정보 조회 API
     *
     * @param userId 조회할 사용자 ID
     * @return 사용자 정보
     */
    @GetMapping("/{userId}")
    @Operation(
            summary = "사용자 정보 조회",
            description = "사용자 ID로 사용자 정보를 조회합니다."
    )
    public ResponseEntity<ApiResponse<User>> getUserById(
            @Parameter(description = "조회할 사용자 ID", required = true)
            @PathVariable Long userId) {

        try {
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

            ApiResponse<User> response = ApiResponse.success("사용자 정보 조회가 완료되었습니다.", user);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            ApiResponse<User> response = ApiResponse.error("USER_NOT_FOUND", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            ApiResponse<User> response = ApiResponse.error("INTERNAL_ERROR", "사용자 정보 조회 중 오류가 발생했습니다.");

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 직원 정보 수정 API
     * STORE-012: 직원 기본 정보, 직책 등 수정
     *
     * @param employeeId 수정할 직원 ID
     * @param updateDto  수정할 정보
     * @return 수정된 직원 정보
     */
    @PutMapping("/{employeeId}")
    @Operation(
            summary = "직원 정보 수정",
            description = "직원의 기본 정보(이름, 이메일), 직책 등을 수정합니다. 사업주 권한이 필요합니다."
    )
    public ResponseEntity<ApiResponse<User>> updateEmployee(
            @Parameter(description = "수정할 직원 ID", required = true)
            @PathVariable Long employeeId,
            @Parameter(description = "수정할 직원 정보", required = true)
            @Valid @RequestBody EmployeeUpdateDto updateDto) {

        try {
            User updatedEmployee = userService.updateEmployeeInfo(employeeId, updateDto);

            ApiResponse<User> response = ApiResponse.success("직원 정보 수정이 완료되었습니다.", updatedEmployee);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            ApiResponse<User> response = ApiResponse.error("INVALID_REQUEST", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            ApiResponse<User> response = ApiResponse.error("INTERNAL_ERROR", "직원 정보 수정 중 오류가 발생했습니다.");

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
