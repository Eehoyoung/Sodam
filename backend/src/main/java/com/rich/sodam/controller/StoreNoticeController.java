package com.rich.sodam.controller;

import com.rich.sodam.dto.request.StoreNoticeCreateRequest;
import com.rich.sodam.dto.response.NoticeReadResponse;
import com.rich.sodam.dto.response.StoreNoticeResponse;
import com.rich.sodam.security.UserPrincipal;
import com.rich.sodam.security.annotation.MasterOnly;
import com.rich.sodam.service.StoreAccessGuard;
import com.rich.sodam.service.StoreNoticeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 매장 공지 + 읽음확인 (M-NEW-04/E-NEW-06). 단방향 공지 + 읽음확인만(채팅 아님).
 *
 * <p>사장(@MasterOnly + StoreAccessGuard): 공지 작성·목록·읽은 직원 조회.
 * 직원(본인 principal 주체): 본인 공지 목록·읽음확인(ack).
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "매장 공지", description = "사장 공지 발행 + 직원 읽음확인 (M-NEW-04/E-NEW-06)")
public class StoreNoticeController {

    private final StoreNoticeService noticeService;
    private final StoreAccessGuard storeAccessGuard;

    // ===== 사장 =====

    @MasterOnly
    @Operation(summary = "공지 작성", description = "공지를 발행하면 매장 직원들에게 알림이 전송돼요.")
    @PostMapping("/api/stores/{storeId}/notices")
    public ResponseEntity<StoreNoticeResponse> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @Valid @RequestBody StoreNoticeCreateRequest req) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(noticeService.create(storeId, req));
    }

    @MasterOnly
    @Operation(summary = "매장 공지 목록", description = "각 공지의 읽음 수(N)/총직원수(M) 포함.")
    @GetMapping("/api/stores/{storeId}/notices")
    public ResponseEntity<List<StoreNoticeResponse>> listForStore(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(noticeService.listForStore(storeId));
    }

    @MasterOnly
    @Operation(summary = "공지를 읽은 직원 목록", description = "누가 확인했는지 목록.")
    @GetMapping("/api/stores/{storeId}/notices/{noticeId}/reads")
    public ResponseEntity<List<NoticeReadResponse>> reads(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long storeId,
            @PathVariable Long noticeId) {
        storeAccessGuard.assertMasterOwnsStore(principal.getId(), storeId);
        return ResponseEntity.ok(noticeService.readsOf(storeId, noticeId));
    }

    // ===== 직원 =====

    @Operation(summary = "내 공지 목록", description = "내가 소속된 매장의 공지 + 본인 읽음 여부.")
    @GetMapping("/api/notices/my")
    public ResponseEntity<List<StoreNoticeResponse>> myNotices(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(noticeService.listForEmployee(principal.getId()));
    }

    @Operation(summary = "공지 읽음확인", description = "\"확인했어요\". 여러 번 눌러도 1건만 기록(멱등).")
    @PostMapping("/api/notices/{noticeId}/ack")
    public ResponseEntity<Void> ack(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long noticeId) {
        noticeService.ack(noticeId, principal.getId());
        return ResponseEntity.noContent().build();
    }
}
