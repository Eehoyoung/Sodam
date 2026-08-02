package com.rich.sodam.service;

import com.rich.sodam.domain.ChatMessage;
import com.rich.sodam.domain.ChatMessageReport;
import com.rich.sodam.domain.ChatUserRestriction;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.UserBlock;
import com.rich.sodam.domain.type.ChatReportReason;
import com.rich.sodam.exception.BusinessException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.ChatMessageReportRepository;
import com.rich.sodam.repository.ChatMessageRepository;
import com.rich.sodam.repository.ChatUserRestrictionRepository;
import com.rich.sodam.repository.UserBlockRepository;
import com.rich.sodam.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 채팅 최소 안전장치 — 메시지 신고 + 사용자 차단(recruitment-monetization-gamification-plan.md §4.4,
 * Phase D).
 *
 * <p><b>신고 누적 제한은 "검토 대기" 플래그일 뿐 자동 영구정지가 아니다</b> — 임계치({@code
 * reportThreshold}) 도달 시 {@link ChatUserRestriction} 행을 만들어 이후 발신을 막지만
 * ({@link ChatRoomService#sendMessage}), 이 행을 지우는 "해제"는 사람이 최종 판단할 운영 대시보드
 * 몫이라 이번 범위에는 포함하지 않는다(§4.4).</p>
 *
 * <p>차단은 {@link ChatRoomService}뿐 아니라 {@link JobSeekingService}의 4km 매칭 리스트에서도
 * 재사용된다({@link #isBlockedEitherWay}) — 상호 비노출을 "리스트·제안·채팅 전 구간"에 일관 적용하기
 * 위해 이 서비스가 유일한 판정 지점이다(중복 구현 금지 원칙, JobOffer/JobApplication lazy 판정과
 * 동일 취지).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatModerationService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatMessageReportRepository chatMessageReportRepository;
    private final ChatUserRestrictionRepository chatUserRestrictionRepository;
    private final UserBlockRepository userBlockRepository;
    private final UserRepository userRepository;

    @Value("${sodam.recruitment.chat.report-threshold:3}")
    private int reportThreshold;

    // ─────────────────────────────────────────────────────────────────
    // POST /api/chat-messages/{messageId}/reports
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public void reportMessage(Long messageId, Long reporterUserId, String reasonRaw) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new EntityNotFoundException("ChatMessage", messageId));
        if (!message.getChatRoom().isParticipant(reporterUserId)) {
            log.warn("권한 거부: user {} 가 message {} 가 속한 채팅방의 참여자가 아님", reporterUserId, messageId);
            throw new AccessDeniedException("본인이 참여한 채팅방의 메시지만 신고할 수 있어요.");
        }
        if (message.getSender() == null || message.getSender().getId().equals(reporterUserId)) {
            throw new BusinessException("본인이 보낸 메시지는 신고할 수 없어요.", "CHAT_REPORT_SELF_NOT_ALLOWED");
        }
        ChatReportReason reason = parseReason(reasonRaw);

        try {
            chatMessageReportRepository.save(
                    ChatMessageReport.of(message, userRepository.getReferenceById(reporterUserId), reason));
        } catch (DataIntegrityViolationException e) {
            // 유니크 제약(message_id, reporter_user_id) 위반 — 이미 이 메시지를 신고했다는 뜻
            throw new ConflictException("이미 신고한 메시지예요.", "CHAT_REPORT_ALREADY_SUBMITTED");
        }

        Long senderId = message.getSender().getId();
        long distinctReporters = chatMessageReportRepository.countDistinctReportersForSender(senderId);
        if (distinctReporters >= reportThreshold && !chatUserRestrictionRepository.existsById(senderId)) {
            try {
                chatUserRestrictionRepository.save(ChatUserRestriction.of(senderId, (int) distinctReporters));
                log.warn("채팅 발신 자동 제한 — userId={} reportCount={}", senderId, distinctReporters);
            } catch (DataIntegrityViolationException e) {
                // 동시 신고 레이스 — 이미 다른 신고로 제한 처리됨(idempotent)
            }
        }

        // 신고 접수 피드백(§4.4) — 채팅창에 시스템 메시지로 즉시 확인시켜준다.
        chatMessageRepository.save(ChatMessage.systemMessage(message.getChatRoom(), "신고가 접수됐어요. 검토 후 안내드릴게요."));
    }

    private ChatReportReason parseReason(String raw) {
        try {
            return ChatReportReason.valueOf(raw);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new BusinessException("신고 사유가 올바르지 않아요.", "CHAT_REPORT_INVALID_REASON");
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // POST /api/users/{userId}/block
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public void block(Long blockerUserId, Long blockedUserId) {
        if (blockerUserId.equals(blockedUserId)) {
            throw new BusinessException("자기 자신은 차단할 수 없어요.", "USER_BLOCK_SELF_NOT_ALLOWED");
        }
        if (userBlockRepository.existsByBlockerUser_IdAndBlockedUser_Id(blockerUserId, blockedUserId)) {
            return; // 이미 차단됨 — 멱등
        }
        User blocker = userRepository.getReferenceById(blockerUserId);
        User blocked = userRepository.findById(blockedUserId)
                .orElseThrow(() -> new EntityNotFoundException("User", blockedUserId));
        try {
            userBlockRepository.save(UserBlock.of(blocker, blocked));
        } catch (DataIntegrityViolationException e) {
            // 동시 요청 레이스 — 이미 차단됨(idempotent)
        }
    }

    /** 두 사용자 중 한쪽이라도 상대를 차단했으면 true — 리스트·채팅 전 구간 상호 비노출 판정의 단일 지점. */
    @Transactional(readOnly = true)
    public boolean isBlockedEitherWay(Long userId1, Long userId2) {
        if (userId1 == null || userId2 == null) {
            return false;
        }
        return userBlockRepository.existsByBlockerUser_IdAndBlockedUser_Id(userId1, userId2)
                || userBlockRepository.existsByBlockerUser_IdAndBlockedUser_Id(userId2, userId1);
    }
}
