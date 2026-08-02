package com.rich.sodam.repository;

import com.rich.sodam.domain.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 채팅 메시지 레포지토리(recruitment-monetization-gamification-plan.md §4, Phase D).
 */
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** {@code GET /api/chat-rooms/{roomId}/messages} — 오래된순 페이징. */
    Page<ChatMessage> findByChatRoom_IdOrderBySentAtAsc(Long chatRoomId, Pageable pageable);

    /** 채팅방 목록 카드의 마지막 메시지 미리보기. */
    Optional<ChatMessage> findTopByChatRoom_IdOrderBySentAtDesc(Long chatRoomId);

    /** 상대가 아직 읽지 않은(내가 보낸 게 아닌) 메시지 — 목록 조회 시 자동 읽음 처리 대상. */
    List<ChatMessage> findByChatRoom_IdAndSender_IdNotAndReadAtIsNull(Long chatRoomId, Long readerUserId);

    /** 채팅방 목록의 안읽음 배지 카운트. */
    long countByChatRoom_IdAndSender_IdNotAndReadAtIsNull(Long chatRoomId, Long readerUserId);
}
