package com.rich.sodam.controller;

import com.rich.sodam.domain.User;
import com.rich.sodam.dto.request.PurposeRequest;
import com.rich.sodam.dto.response.ApiResponse;
import com.rich.sodam.jwt.JwtTokenProvider;
import com.rich.sodam.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * 사용자 목적 설정 컨트롤러
 * Kakao 최초 가입자의 목적(personal/employee/boss) 설정을 처리합니다.
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "사용자 목적 설정", description = "Kakao 가입자의 목적 설정 API")
public class UsersPurposeController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UsersPurposeController.class);

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    public UsersPurposeController(UserService userService, JwtTokenProvider jwtTokenProvider) {
        this.userService = userService;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    /**
     * 목적 설정 엔드포인트
     * POST /api/users/{userId}/purpose
     */
    @PostMapping("/{userId}/purpose")
    @Operation(summary = "사용자 목적 설정", description = "로그인 사용자가 자신의 목적을(personal/employee/boss) 설정하여 등급을 갱신합니다.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> setPurpose(
            @Parameter(description = "대상 사용자 ID", required = true)
            @PathVariable Long userId,
            @Valid @RequestBody PurposeRequest request,
            HttpServletRequest httpRequest
    ) {
        try {
            // 인증 토큰에서 사용자 ID 추출 및 본인 확인
            String token = jwtTokenProvider.resolveToken(httpRequest);
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("UNAUTHORIZED", "유효하지 않은 토큰입니다."));
            }
            Long authUserId = jwtTokenProvider.getUserId(token);
            if (authUserId == null || !authUserId.equals(userId)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error("UNAUTHORIZED", "본인만 목적을 설정할 수 있습니다."));
            }

            User updated = userService.updatePurpose(userId, request.getPurpose());

            Map<String, Object> result = new HashMap<>();
            result.put("userId", updated.getId());
            result.put("userGrade", updated.getUserGrade().getValue());

            return ResponseEntity.ok(ApiResponse.success("purpose updated", result));
        } catch (IllegalArgumentException e) {
            log.warn("목적 설정 실패(잘못된 요청) userId={}, reason={}", userId, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error("BAD_REQUEST", e.getMessage()));
        } catch (IllegalStateException e) {
            // 정책 충돌(다운그레이드 시도 등)
            log.warn("목적 설정 충돌 userId={}, reason={}", userId, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error("CONFLICT", e.getMessage()));
        } catch (Exception e) {
            log.error("목적 설정 처리 중 내부 오류 userId={}, error={}", userId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("INTERNAL_ERROR", "목적 설정 처리 중 오류가 발생했습니다."));
        }
    }
}
