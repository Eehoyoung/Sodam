package com.rich.sodam.controller;

import com.rich.sodam.domain.StoreQrToken;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.security.authorization.StoreAuthorizationPolicy;
import com.rich.sodam.service.StoreQrTokenService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

/**
 * 매장 QR 발급·회전 (WP-C) — 사장 전용.
 *
 * <p>QR 이 유출됐다고 판단되면 사장이 즉시 재발급해 이전 QR 을 끊을 수 있어야 한다.
 * 만료를 기다리게 하면 유출 대응이 성립하지 않는다.</p>
 */
@MasterOnly
@RestController
@RequestMapping("/api/stores/{storeId}/qr")
@RequiredArgsConstructor
@Tag(name = "매장 QR", description = "QR 출퇴근용 매장 코드 발급·재발급")
public class StoreQrCodeController {

    private final StoreQrTokenService storeQrTokenService;
    private final StoreAuthorizationPolicy storeAccessGuard;

    /**
     * QR 응답 — 토큰과 만료 시각만 담는다. 앱은 이 토큰을 QR 이미지로 렌더링한다.
     */
    public record QrCodeResponse(Long storeId, String token, LocalDateTime issuedAt, LocalDateTime expiresAt) {
        static QrCodeResponse from(StoreQrToken t) {
            return new QrCodeResponse(t.getStore().getId(), t.getToken(), t.getIssuedAt(), t.getExpiresAt());
        }
    }

    @Operation(summary = "매장 QR 조회", description = "현재 유효한 QR 을 반환합니다. 없으면 새로 발급합니다.")
    @GetMapping
    public ResponseEntity<QrCodeResponse> current(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable Long storeId) {
        // 가드는 try 블록 밖 — 인가 실패가 예외 처리에 삼켜지면 BOLA 가 된다(프로젝트 컨벤션).
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(QrCodeResponse.from(storeQrTokenService.currentOrIssue(storeId)));
    }

    @Operation(summary = "매장 QR 재발급",
            description = "새 QR 을 발급하고 이전 QR 을 즉시 무효화합니다. QR 사진이 유출됐을 때 사용하세요.")
    @PostMapping("/rotate")
    public ResponseEntity<QrCodeResponse> rotate(@AuthenticationPrincipal UserPrincipal principal,
                                                 @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(QrCodeResponse.from(
                storeQrTokenService.rotate(storeId, StoreQrToken.DEFAULT_VALIDITY)));
    }
}
