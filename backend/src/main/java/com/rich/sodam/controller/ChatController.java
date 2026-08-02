package com.rich.sodam.controller;

import com.rich.sodam.dto.request.ChatMessageSendRequest;
import com.rich.sodam.dto.response.ChatMessageResponse;
import com.rich.sodam.dto.response.ChatRoomListItemResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.EmployeeOrMaster;
import com.rich.sodam.service.ChatRoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 채용 매칭 채팅 API — 사장↔구직자 1:1 채팅방(recruitment-monetization-gamification-plan.md §4,
 * Phase D).
 *
 * <p>매장 스코프 API가 아니라 채팅방 참여자 스코프이므로 {@code StoreAuthorizationPolicy}(매장 소유
 * 검증)가 아니라 서비스 레이어가 채팅방을 먼저 로드해 참여자 본인 여부를 검증한다(경로에 storeId가
 * 없어 컨트롤러 단에서 매장 가드를 걸 수 없는 {@code JobApplicationService.respondToApplication}과
 * 동일한 "엔티티 로드 후 소유 검증" 패턴).</p>
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "채용 채팅(Chat)", description = "채용 매칭(제안 수락/지원 응답) 성립 후 개설되는 1:1 채팅방")
public class ChatController {

    private final ChatRoomService chatRoomService;

    @EmployeeOrMaster
    @Operation(summary = "내 채팅방 목록", description = "사장/구직자 어느 쪽이든 참여중인 채팅방을 최신순으로 반환합니다. 차단한 상대의 방은 제외됩니다.")
    @GetMapping("/api/chat-rooms/me")
    public ResponseEntity<List<ChatRoomListItemResponse>> getMyChatRooms(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(chatRoomService.getMyChatRooms(principal.getId()));
    }

    @EmployeeOrMaster
    @Operation(summary = "채팅 메시지 목록 조회", description = "오래된순 페이징. 조회 시 상대가 보낸 미읽음 메시지를 자동으로 읽음 처리합니다.")
    @GetMapping("/api/chat-rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        int pageSize = Math.min(Math.max(size, 1), 100);
        return ResponseEntity.ok(chatRoomService.getMessages(roomId, principal.getId(), page, pageSize));
    }

    @EmployeeOrMaster
    @Operation(summary = "채팅 메시지 전송",
            description = "전화번호/계좌번호 패턴은 자동 마스킹되어 저장됩니다. 읽기 전용(§4.6)으로 전환된 채팅방은 409를 반환합니다.")
    @PostMapping("/api/chat-rooms/{roomId}/messages")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long roomId,
            @Valid @RequestBody ChatMessageSendRequest request) {
        ChatMessageResponse response = chatRoomService.sendMessage(roomId, principal.getId(), request.content());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
