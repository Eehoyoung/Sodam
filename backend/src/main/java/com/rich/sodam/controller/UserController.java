package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.EmployeeUpdateDto;
import com.rich.sodam.dto.request.ProfileBasicsUpdateDto;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.dto.response.UserResponseDto;
import com.rich.sodam.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.AnyAuthenticated;
import com.rich.sodam.security.annotation.MasterOnly;

import java.util.Set;

/**
 * 사용자 관리 컨트롤러
 * 사용자 정보 조회, 역할 변경 등의 기능을 제공합니다.
 */
@AnyAuthenticated
@RestController
@RequestMapping("/api/user")
@Tag(name = "사용자 관리", description = "사용자 정보 조회 및 관리 API")
public class UserController {

    private final UserService userService;
    private final com.rich.sodam.service.StoreAccessGuard storeAccessGuard;

    public UserController(UserService userService,
                          com.rich.sodam.service.StoreAccessGuard storeAccessGuard) {
        this.userService = userService;
        this.storeAccessGuard = storeAccessGuard;
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
    public ResponseEntity<ApiResponse<UserResponseDto>> convertToOwner(
            @Parameter(description = "전환할 사용자 ID", required = true)
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal) {

        // 본인만 사업주 전환 가능 (타인 계정 권한 상승 차단)
        if (principal == null || !principal.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("FORBIDDEN", "본인만 사업주로 전환할 수 있어요."));
        }

        try {
            User convertedUser = userService.convertToOwner(userId);

            ApiResponse<UserResponseDto> response =
                    ApiResponse.success("사업주 전환이 완료되었습니다.", UserResponseDto.from(convertedUser));

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_REQUEST", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("INTERNAL_ERROR", "사업주 전환 중 오류가 발생했습니다."));
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
            description = "사용자 ID로 사용자 정보를 조회합니다. 본인 또는 사업주(MASTER/MANAGER)만 조회 가능합니다."
    )
    public ResponseEntity<ApiResponse<UserResponseDto>> getUserById(
            @Parameter(description = "조회할 사용자 ID", required = true)
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal) {

        // IDOR 차단: 본인 또는 사업주(직원 관리 권한) 만 타 사용자 조회 허용.
        // 일반 직원이 임의 userId 로 타인 PII 를 조회하던 취약점 제거.
        if (principal == null
                || (!principal.getId().equals(userId) && !hasManagerRole(principal))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("FORBIDDEN", "조회 권한이 없어요."));
        }

        try {
            User user = userService.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. ID: " + userId));

            ApiResponse<UserResponseDto> response =
                    ApiResponse.success("사용자 정보 조회가 완료되었습니다.", UserResponseDto.from(user));

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("USER_NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("INTERNAL_ERROR", "사용자 정보 조회 중 오류가 발생했습니다."));
        }
    }

    /** 사업주/관리자 권한(직원 관리 가능) 보유 여부. */
    private boolean hasManagerRole(UserPrincipal principal) {
        Set<String> managerRoles = Set.of("ROLE_MASTER");
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(managerRoles::contains);
    }

    /**
     * 직원 정보 수정 API
     * STORE-012: 직원 기본 정보, 직책 등 수정
     *
     * @param employeeId 수정할 직원 ID
     * @param updateDto  수정할 정보
     * @return 수정된 직원 정보
     */
    @MasterOnly // 직원 정보 수정은 사업주(MASTER/MANAGER)만 — 문서상 명시돼 있던 권한을 실제 강제
    @PutMapping("/{employeeId}")
    @Operation(
            summary = "직원 정보 수정",
            description = "직원의 기본 정보(이름, 이메일), 직책 등을 수정합니다. 사업주 권한이 필요합니다."
    )
    public ResponseEntity<ApiResponse<UserResponseDto>> updateEmployee(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "수정할 직원 ID", required = true)
            @PathVariable Long employeeId,
            @Parameter(description = "수정할 직원 정보", required = true)
            @Valid @RequestBody EmployeeUpdateDto updateDto) {

        // BOLA 차단: 본인 매장 소속 직원만 수정(임의 userId 조작·권한상승 방지).
        // try 밖에 둬 AccessDeniedException 이 Security 핸들러로 전파되어 403 이 되게 한다.
        storeAccessGuard.assertCanViewEmployee(principal.getId(), employeeId, true);

        try {
            User updatedEmployee = userService.updateEmployeeInfo(employeeId, updateDto);

            ApiResponse<UserResponseDto> response =
                    ApiResponse.success("직원 정보 수정이 완료되었습니다.", UserResponseDto.from(updatedEmployee));

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID_REQUEST", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("INTERNAL_ERROR", "직원 정보 수정 중 오류가 발생했습니다."));
        }
    }

    /**
     * 프로필 기본정보 보강 (회원가입 후 첫 로그인 직후).
     * - 전화번호(필수) + 이름 확정 + 생년월일(선택) 한 번에 수집
     * - 완료 시 profile_completed_at 마킹 → FE 가 다음부터 본 화면 우회
     * - 응답에 profileCompleted=true 포함 (FE 분기용)
     */
    @PutMapping("/me/profile-basics")
    @Operation(summary = "프로필 기본정보 보강",
            description = "회원가입 후 전화번호·이름·생년월일을 한 번에 보강. profile_completed_at 마킹.")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> completeProfile(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @Valid @RequestBody ProfileBasicsUpdateDto body) {
        if (principal == null || principal.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("UNAUTHORIZED", "로그인이 필요해요."));
        }
        try {
            User updated = userService.completeProfileBasics(
                    principal.getId(),
                    body.getPhone(),
                    body.getName(),
                    body.getBirthDate()
            );
            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("userId", updated.getId());
            result.put("name", updated.getName());
            result.put("phone", updated.getPhone());
            result.put("birthDate", updated.getBirthDate());
            result.put("profileCompleted", updated.isProfileCompleted());
            return ResponseEntity.ok(ApiResponse.success("프로필이 저장됐어요.", result));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID", e.getMessage()));
        }
    }

    /**
     * 본인 정보 셀프 변경 (이름).
     */
    @PutMapping("/me")
    @Operation(summary = "내 정보 변경 (이름)",
            description = "본인 이름만 변경. 이메일 변경은 별도 인증 흐름 필요.")
    public ResponseEntity<ApiResponse<UserResponseDto>> updateMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody(required = false) java.util.Map<String, String> body) {
        if (principal == null || principal.getId() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("UNAUTHORIZED", "로그인이 필요해요."));
        }
        // body 가 null/empty 인 경우에도 동작 — 변경할 값이 없으면 현재 값 그대로 반환.
        String name = (body == null) ? null : body.get("name");
        try {
            User updated = userService.updateBasicInfo(principal.getId(), name);
            return ResponseEntity.ok(ApiResponse.success("정보가 변경됐어요.", UserResponseDto.from(updated)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("INVALID", e.getMessage()));
        }
    }

    /**
     * 회원 탈퇴 (PRD_OWNER A5).
     * - 활성 구독 보유 시 차단 (선해지 안내)
     * - 직원 관계 모두 비활성
     * - User 는 90일 동안 보관 (탈퇴 표시 후 배치로 PII 익명화)
     */
    @DeleteMapping("/{userId}")
    @Operation(summary = "회원 탈퇴",
            description = "활성 구독이 있으면 차단합니다. 직원 관계는 모두 비활성화됩니다.")
    public ResponseEntity<ApiResponse<Void>> withdrawUser(
            @PathVariable Long userId,
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal) {
        if (principal == null || !principal.getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.error("FORBIDDEN", "본인만 탈퇴할 수 있어요."));
        }
        try {
            userService.withdrawUser(userId);
            return ResponseEntity.ok(ApiResponse.success("회원 탈퇴가 완료되었어요.", null));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("ACTIVE_SUBSCRIPTION", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("INTERNAL_ERROR", "탈퇴 처리 중 오류가 발생했어요."));
        }
    }
}
