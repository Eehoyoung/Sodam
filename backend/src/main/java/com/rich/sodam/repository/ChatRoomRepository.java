package com.rich.sodam.repository;

import com.rich.sodam.domain.ChatRoom;
import com.rich.sodam.domain.type.ChatSourceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * 채팅방 레포지토리(recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * <p>매칭 1건당 채팅방 1개 최종 방어는 V73의 {@code (source_type, source_id)} 유니크 인덱스가
 * 담당한다 — 아래 조회는 사용자 친화적 idempotent 생성(이미 있으면 재생성하지 않음)을 위한
 * 사전 체크다.</p>
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    boolean existsBySourceTypeAndSourceId(ChatSourceType sourceType, Long sourceId);

    Optional<ChatRoom> findBySourceTypeAndSourceId(ChatSourceType sourceType, Long sourceId);

    /** 내 채팅방 목록({@code GET /api/chat-rooms/me}) — 사장/구직자 어느 쪽이든 최신 생성순. */
    List<ChatRoom> findByMasterUser_IdOrCounterpartUser_IdOrderByCreatedAtDesc(Long masterUserId, Long counterpartUserId);
}
