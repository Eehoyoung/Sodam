package com.rich.sodam.controller;

import com.rich.sodam.dto.request.PasswordResetRequestDto;
import com.rich.sodam.service.PasswordResetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 비밀번호 재설정 OTP API (PRD_GUEST G-006).
 *
 * 흐름:
 *   1. POST /api/auth/password-reset/request   { email }
 *   2. POST /api/auth/password-reset/verify    { email, code } → { resetTicket }
 *   3. POST /api/auth/password-reset/confirm   { resetTicket, newPassword }
 */
@RestController
@RequestMapping("/api/auth/password-reset")
@RequiredArgsConstructor
@Tag(name = "인증", description = "비밀번호 재설정 OTP")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @Operation(summary = "재설정 코드 발송",
            description = "이메일로 6자리 OTP 발송. 응답은 계정 존재 여부와 무관하게 동일.")
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> request(@Valid @RequestBody PasswordResetRequestDto.Request dto) {
        passwordResetService.requestReset(dto.getEmail());
        return ResponseEntity.ok(Map.of(
                "message", "입력하신 이메일이 등록되어 있다면 인증번호가 발송되었어요.",
                "validMinutes", "5"
        ));
    }

    @Operation(summary = "OTP 검증", description = "성공 시 일회용 resetTicket 반환 (5분간 유효).")
    @PostMapping("/verify")
    public ResponseEntity<Map<String, String>> verify(@Valid @RequestBody PasswordResetRequestDto.Verify dto) {
        String ticket = passwordResetService.verifyCode(dto.getEmail(), dto.getCode());
        if (ticket == null) {
            return ResponseEntity.status(401).body(Map.of("message", "인증번호가 일치하지 않거나 만료되었어요."));
        }
        return ResponseEntity.ok(Map.of("resetTicket", ticket));
    }

    @Operation(summary = "새 비밀번호 설정", description = "비번 정책: 8자 이상 + 대소문자·숫자·특수문자 각 1자 이상.")
    @PostMapping("/confirm")
    public ResponseEntity<Map<String, String>> confirm(@Valid @RequestBody PasswordResetRequestDto.Confirm dto) {
        boolean ok = passwordResetService.confirmReset(dto.getResetTicket(), dto.getNewPassword());
        if (!ok) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "비밀번호 변경에 실패했어요. 인증 만료 또는 비번 규칙 위반."
            ));
        }
        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었어요."));
    }
}
