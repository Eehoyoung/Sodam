package com.rich.sodam.controller;

import com.rich.sodam.dto.request.ChatMessageReportRequest;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.ChatModerationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 채팅 최소 안전장치 API — 메시지 신고 + 사용자 차단
 * (recruitment-monetization-gamification-plan.md §4.4, Phase D).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "채팅 신고/차단", description = "메시지 단위 신고 + 사용자 차단")
public class ChatModerationController {

    private final ChatModerationService chatModerationService;

    @EmployeeOrMaster
    @Operation(summary = "채팅 메시지 신고", description = "본인이 참여한 채팅방의 상대 메시지만 신고할 수 있습니다. 동일 메시지 중복 신고 시 409.")
    @PostMapping("/api/chat-messages/{messageId}/reports")
    public ResponseEntity<Void> reportMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long messageId,
            @Valid @RequestBody ChatMessageReportRequest request) {
        chatModerationService.reportMessage(messageId, principal.getId(), request.reason());
        return ResponseEntity.noContent().build();
    }

    @EmployeeOrMaster
    @Operation(summary = "사용자 차단", description = "차단하면 구직 매칭 리스트·제안·채팅 전 구간에서 서로에게 노출되지 않습니다.")
    @PostMapping("/api/users/{userId}/block")
    public ResponseEntity<Void> block(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long userId) {
        chatModerationService.block(principal.getId(), userId);
        return ResponseEntity.noContent().build();
    }
}
