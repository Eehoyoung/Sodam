package com.rich.sodam.controller;

import com.rich.sodam.dto.request.DeviceTokenRequest;
import com.rich.sodam.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.rich.sodam.security.annotation.AnyAuthenticated;
import com.rich.sodam.service.NotificationService;

@AnyAuthenticated
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "알림", description = "FCM 디바이스 토큰 등록/해제")
public class NotificationController {

    private final NotificationService notificationService;
    private final com.rich.sodam.security.authorization.StoreAuthorizationPolicy storeAccessGuard;

    @Operation(summary = "FCM 토큰 등록", description = "앱 실행 시 토큰을 서버에 저장하여 푸시 발송 대상으로 등록.")
    @PostMapping("/token")
    public ResponseEntity<Void> registerToken(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DeviceTokenRequest req) {
        notificationService.registerDeviceToken(principal.getId(), req);
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "FCM 토큰 해제", description = "로그아웃/앱 삭제 시 호출.")
    @DeleteMapping("/token")
    public ResponseEntity<Void> unregisterToken(
            @org.springframework.security.core.annotation.AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String token) {
        // IDOR 차단: 본인 소유 토큰만 삭제(타인 토큰 삭제 → 푸시 차단 DoS 방지)
        notificationService.unregisterDeviceToken(principal.getId(), token);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "사장 → 직원 푸시 발송 (커스텀 메시지)",
            description = "사장이 직원에게 임의 메시지를 보냅니다. 알림 inbox 에 자동 적재.")
    @com.rich.sodam.security.annotation.MasterOnly
    @PostMapping("/push-to-employee")
    public ResponseEntity<java.util.Map<String, String>> pushToEmployee(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @Valid @RequestBody(required = false) java.util.Map<String, Object> body) {
        if (body == null || body.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("message", "요청 본문이 비어 있어요."));
        }
        Long employeeId = parseEmployeeId(body.get("employeeId"));
        Object titleObj = body.getOrDefault("title", "사장님 메시지");
        String title = titleObj == null ? "사장님 메시지" : titleObj.toString();
        Object bodyObj = body.get("body");
        String message = bodyObj == null ? null : bodyObj.toString();
        if (employeeId == null || message == null || message.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("message", "employeeId 와 body 가 필요해요."));
        }
        // 제목·본문 길이 가드 (NotificationInbox 컬럼 한도 = 100 / 300)
        if (title.length() > 100) title = title.substring(0, 100);
        if (message.length() > 300) message = message.substring(0, 300);
        // BOLA 차단: 사장의 매장에 소속된 직원에게만 발송(임의 사용자 푸시·사칭 방지)
        storeAccessGuard.assertCanViewEmployee(principal.getId(), employeeId, true);
        // 알림 이력 적재 (NotificationCenter 에서 보임)
        boolean sent = notificationService.sendCustomInboxMessage(employeeId, title, message);
        if (!sent) {
            return ResponseEntity.badRequest()
                    .body(java.util.Map.of("message", "직원을 찾을 수 없어요."));
        }
        // TODO[실 푸시]: NotificationService.push 호출로 FCM 전송 — bean 주입 추가 필요
        return ResponseEntity.ok(java.util.Map.of("message", "메시지를 전달했어요."));
    }

    /** Jackson 이 Number/String 어느 형태로 역직렬화하든 안전하게 Long 으로 변환. */
    private Long parseEmployeeId(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try {
            return Long.valueOf(v.toString().trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Operation(summary = "알림 이력 조회",
            description = "사용자의 받은 알림 페이지네이션 조회. 최대 50개씩.")
    @GetMapping("/inbox")
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> inbox(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        int pageSize = Math.min(Math.max(size, 1), 50);
        return ResponseEntity.ok(notificationService.getInboxPage(principal.getId(), page, pageSize));
    }

    @Operation(summary = "읽지 않은 알림 수")
    @GetMapping("/inbox/unread-count")
    public ResponseEntity<java.util.Map<String, Long>> unreadCount(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal) {
        long count = notificationService.countUnreadInbox(principal.getId());
        return ResponseEntity.ok(java.util.Map.of("unread", count));
    }

    @Operation(summary = "알림 읽음 처리")
    @PostMapping("/inbox/{id}/read")
    public ResponseEntity<Void> markRead(
            @org.springframework.security.core.annotation.AuthenticationPrincipal
                com.rich.sodam.security.UserPrincipal principal,
            @PathVariable Long id) {
        notificationService.markInboxRead(id, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
