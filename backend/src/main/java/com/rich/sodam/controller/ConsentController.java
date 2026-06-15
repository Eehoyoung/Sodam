package com.rich.sodam.controller;

import com.rich.sodam.dto.request.ConsentRequestDto;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.AnyAuthenticated;
import com.rich.sodam.service.ConsentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 동의 수집 API (PIPA §22 — 필수/선택 분리). 소셜 가입 후 동의 보강, 위치정보 동의에 사용.
 * 약관 본문(법률 문구)은 별도 관리하며 본 API는 동의 사실·버전·시점만 기록한다.
 */
@AnyAuthenticated
@RestController
@RequestMapping("/api/auth/consents")
@RequiredArgsConstructor
@Tag(name = "동의 관리", description = "약관·개인정보·위치정보 동의 수집 API")
public class ConsentController {

    private final ConsentService consentService;

    @Operation(summary = "동의 수집", description = "필수(이용약관·개인정보·만14세)/선택(위치정보·마케팅) 동의를 기록합니다.")
    @PostMapping
    public ResponseEntity<Void> recordConsents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody ConsentRequestDto dto) {
        consentService.recordConsents(principal.getId(), dto);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "위치정보 동의/철회", description = "GPS 출퇴근용 위치정보 수집·이용 동의를 단건 기록/철회합니다.")
    @PutMapping("/location")
    public ResponseEntity<Void> recordLocationConsent(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam boolean agreed) {
        consentService.recordLocationConsent(principal.getId(), agreed);
        return ResponseEntity.ok().build();
    }
}
