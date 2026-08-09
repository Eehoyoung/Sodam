package com.rich.sodam.controller;

import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.AnyAuthenticated;
import com.rich.sodam.service.ConsentService;
import com.rich.sodam.service.PersonalModeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 개인 모드 상태 조회·전환 (PRD §2.1, §4.14 / WP-K).
 *
 * <p>본인 것만 다룬다 — 경로에 userId 가 없고 서버가 JWT 주체로만 동작하므로 타인의 상태를
 * 바꿀 수 없다. {@code @AnyAuthenticated}로 두는 이유는 신규 가입자(UserGrade.Personal)도
 * 자기 상태를 조회할 수 있어야 하기 때문이다.</p>
 *
 * <p>⛔ <b>전환 동의 화면의 문구는 이 API 의 범위가 아니다.</b> 임금·퇴직금 청구권에 영향이 없다는 점,
 * 근로관계 종료와 무관하다는 점, 회원탈퇴가 아니라는 점은 필수 고지 항목이며
 * (2026-08-07 법무·노무 검토) 문구 확정 전에는 전환 화면을 노출하지 않는다.</p>
 */
@AnyAuthenticated
@RestController
@RequestMapping("/api/me/personal-mode")
@RequiredArgsConstructor
@Tag(name = "개인 모드", description = "매장 소속 없이 혼자 근무를 기록하는 상태")
public class PersonalModeController {

    private final PersonalModeService personalModeService;
    private final ConsentService consentService;

    @Operation(summary = "개인 모드 상태 조회",
            description = "개인 모드 사용 여부, 활성 매장 소속 수, 전환 권유 필요 여부를 반환합니다.")
    @GetMapping
    public ResponseEntity<PersonalModeService.Status> status(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(personalModeService.status(principal.getId()));
    }

    @Operation(summary = "개인 모드 켜기/끄기",
            description = "동의 이력(TermsType.PERSONAL_MODE_CONVERSION)을 남기고 상태를 전환합니다. "
                    + "계정 등급(UserGrade)은 바뀌지 않습니다 — 개인 모드는 역할이 아니라 상태입니다.")
    @PostMapping
    public ResponseEntity<PersonalModeService.Status> toggle(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "true") boolean agreed) {
        consentService.recordPersonalModeConsent(principal.getId(), agreed);
        return ResponseEntity.ok(personalModeService.status(principal.getId()));
    }
}
