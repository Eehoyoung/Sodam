package com.rich.sodam.service;

import com.rich.sodam.domain.ChatMessage;
import com.rich.sodam.domain.ChatRoom;
import com.rich.sodam.domain.ChatUserRestriction;
import com.rich.sodam.domain.JobApplication;
import com.rich.sodam.domain.JobOffer;
import com.rich.sodam.domain.JobPosting;
import com.rich.sodam.domain.MasterStoreRelation;
import com.rich.sodam.domain.User;
import com.rich.sodam.domain.type.ChatRoomStatus;
import com.rich.sodam.domain.type.ChatSourceType;
import com.rich.sodam.dto.response.ChatMessageResponse;
import com.rich.sodam.dto.response.ChatRoomListItemResponse;
import com.rich.sodam.exception.ChatSenderRestrictedException;
import com.rich.sodam.exception.ConflictException;
import com.rich.sodam.exception.EntityNotFoundException;
import com.rich.sodam.repository.ChatMessageRepository;
import com.rich.sodam.repository.ChatRoomRepository;
import com.rich.sodam.repository.ChatUserRestrictionRepository;
import com.rich.sodam.repository.MasterStoreRelationRepository;
import com.rich.sodam.repository.UserRepository;
import com.rich.sodam.util.ChatMessageMasker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * 채팅방/메시지 서비스(recruitment-monetization-gamification-plan.md §4, Phase D).
 *
 * <p><b>개설 트리거</b> — {@link ChatRoom} 클래스 javadoc 참고. {@link JobOfferService#respondToOffer}
 * (수락 시)와 {@link JobApplicationService#respondToApplication}(수락/거절 모두)이 각각
 * {@link #openForOfferAccepted}/{@link #openForApplicationResponded}를 호출한다 — 이 서비스 스스로는
 * 매칭 상태를 바꾸지 않고, 이미 성립된 매칭을 받아 채팅방만 연다.</p>
 *
 * <p><b>읽기 전용 lazy 전환</b>(§4.6): 배치 없이 메시지 발신 시점에 원본 매칭({@code JobOffer}/
 * {@code JobApplication})의 유효 상태를 재확인해, DECLINED/EXPIRED 상태로 확정된 지
 * {@code readonlyGraceDays} 이상 지났으면 그 자리에서 {@link ChatRoom#markReadOnly()}를 호출하고
 * 저장한 뒤 발신을 막는다(JobOffer/JobApplication의 lazy EXPIRED 판정과 동일 원칙).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatUserRestrictionRepository restrictionRepository;
    private final UserRepository userRepository;
    private final MasterStoreRelationRepository masterStoreRelationRepository;
    private final LiveSyncPublisher liveSyncPublisher;
    private final NotificationService notificationService;
    private final ChatModerationService chatModerationService;

    @Value("${sodam.recruitment.chat.readonly-grace-days:7}")
    private int readonlyGraceDays;

    // ─────────────────────────────────────────────────────────────────
    // 채팅방 개설 — JobOfferService/JobApplicationService가 매칭 성립 시점에 호출
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public void openForOfferAccepted(JobOffer offer) {
        if (chatRoomRepository.existsBySourceTypeAndSourceId(ChatSourceType.OFFER, offer.getId())) {
            return;
        }
        Long ownerUserId = resolveStoreOwnerUserId(offer.getStore().getId());
        if (ownerUserId == null) {
            log.warn("채팅방 개설 스킵 — 매장 소유자를 찾을 수 없음 storeId={}", offer.getStore().getId());
            return;
        }
        User master = userRepository.getReferenceById(ownerUserId);
        ChatRoom room = ChatRoom.open(offer.getStore(), master, offer.getTargetUser(),
                ChatSourceType.OFFER, offer.getId(), offer.getWorkType().name(), offer.getWorkDate(),
                offer.getStartTime(), offer.getEndTime(), offer.getHourlyWage(), offer.getRespondedAt());
        saveNewRoomIdempotently(room, ChatSourceType.OFFER, offer.getId());
    }

    @Transactional
    public void openForApplicationResponded(JobApplication application, Long masterId) {
        if (chatRoomRepository.existsBySourceTypeAndSourceId(ChatSourceType.APPLICATION, application.getId())) {
            return;
        }
        JobPosting posting = application.getPosting();
        User master = userRepository.getReferenceById(masterId);
        ChatRoom room = ChatRoom.open(posting.getStore(), master, application.getApplicantUser(),
                ChatSourceType.APPLICATION, application.getId(), posting.getWorkType().name(), posting.getWorkDate(),
                posting.getStartTime(), posting.getEndTime(), posting.getHourlyWage(), application.getRespondedAt());
        saveNewRoomIdempotently(room, ChatSourceType.APPLICATION, application.getId());
    }

    private void saveNewRoomIdempotently(ChatRoom room, ChatSourceType sourceType, Long sourceId) {
        try {
            ChatRoom saved = chatRoomRepository.save(room);
            ChatMessage opening = ChatMessage.systemMessage(saved, openingSystemMessage(sourceType));
            chatMessageRepository.save(opening);
        } catch (DataIntegrityViolationException e) {
            // 동시 요청 레이스 — 유니크 제약(source_type, source_id) 위반은 이미 채팅방이 개설됐다는 뜻이므로 무시(idempotent).
            log.info("채팅방 동시 중복 개설 방지 — sourceType={} sourceId={}", sourceType, sourceId);
        }
    }

    private String openingSystemMessage(ChatSourceType sourceType) {
        return sourceType == ChatSourceType.APPLICATION
                ? "지원서를 열람하고 채팅방을 시작했어요."
                : "채용 제안이 수락되어 채팅방이 시작됐어요.";
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/chat-rooms/me
    // ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ChatRoomListItemResponse> getMyChatRooms(Long userId) {
        return chatRoomRepository.findByMasterUser_IdOrCounterpartUser_IdOrderByCreatedAtDesc(userId, userId).stream()
                .filter(room -> !chatModerationService.isBlockedEitherWay(userId, room.otherParticipant(userId).getId()))
                .map(room -> toListItem(room, userId))
                .toList();
    }

    private ChatRoomListItemResponse toListItem(ChatRoom room, Long viewerUserId) {
        User counterpart = room.otherParticipant(viewerUserId);
        Optional<ChatMessage> last = chatMessageRepository.findTopByChatRoom_IdOrderBySentAtDesc(room.getId());
        long unread = chatMessageRepository.countByChatRoom_IdAndSender_IdNotAndReadAtIsNull(room.getId(), viewerUserId);
        ChatRoomStatus effectiveStatus = resolveEffectiveStatus(room);

        return new ChatRoomListItemResponse(
                room.getId(),
                room.getStore().getId(),
                room.getStore().getStoreName(),
                counterpart.getId(),
                counterpart.getName(),
                room.getWorkType(),
                room.getWorkDate(),
                room.getStartTime(),
                room.getEndTime(),
                room.getHourlyWage(),
                effectiveStatus.name(),
                last.map(ChatMessage::getContent).orElse(null),
                last.map(ChatMessage::getSentAt).orElse(null),
                unread,
                room.getMatchedAt());
    }

    // ─────────────────────────────────────────────────────────────────
    // GET /api/chat-rooms/{roomId}/messages
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public List<ChatMessageResponse> getMessages(Long chatRoomId, Long userId, int page, int size) {
        ChatRoom room = loadRoomForParticipant(chatRoomId, userId);
        assertNotBlocked(room, userId);

        // 목록 조회 시점에 상대가 보낸 미읽음 메시지를 자동으로 읽음 처리한다(카톡류 관행).
        chatMessageRepository.findByChatRoom_IdAndSender_IdNotAndReadAtIsNull(chatRoomId, userId)
                .forEach(m -> m.markReadBy(userId));

        Page<ChatMessage> messages = chatMessageRepository.findByChatRoom_IdOrderBySentAtAsc(
                chatRoomId, PageRequest.of(page, size));
        return messages.getContent().stream().map(m -> toMessageResponse(m, userId)).toList();
    }

    // ─────────────────────────────────────────────────────────────────
    // POST /api/chat-rooms/{roomId}/messages
    // ─────────────────────────────────────────────────────────────────

    @Transactional
    public ChatMessageResponse sendMessage(Long chatRoomId, Long senderUserId, String rawContent) {
        ChatRoom room = loadRoomForParticipant(chatRoomId, senderUserId);
        assertNotBlocked(room, senderUserId);
        assertSenderNotRestricted(senderUserId);
        assertWritable(room);

        ChatMessageMasker.MaskResult masked = ChatMessageMasker.mask(rawContent);
        User sender = userRepository.getReferenceById(senderUserId);
        ChatMessage message = ChatMessage.userMessage(room, sender, masked.content(), masked.masked());
        message = chatMessageRepository.save(message);

        ChatMessageResponse recipientView = toMessageResponse(message, room.otherParticipant(senderUserId).getId());
        liveSyncPublisher.publishChatMessage(chatRoomId, recipientView);

        User recipient = room.otherParticipant(senderUserId);
        notificationService.notifyChatMessageReceived(recipient.getId(), sender.getName(), room.getStore().getStoreName());

        return toMessageResponse(message, senderUserId);
    }

    // ─────────────────────────────────────────────────────────────────
    // 공통 헬퍼
    // ─────────────────────────────────────────────────────────────────

    private ChatRoom loadRoomForParticipant(Long chatRoomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(chatRoomId)
                .orElseThrow(() -> new EntityNotFoundException("ChatRoom", chatRoomId));
        if (!room.isParticipant(userId)) {
            log.warn("권한 거부: user {} 가 chatRoom {} 의 참여자가 아님", userId, chatRoomId);
            throw new AccessDeniedException("본인이 참여한 채팅방만 볼 수 있어요.");
        }
        return room;
    }

    private void assertNotBlocked(ChatRoom room, Long viewerUserId) {
        Long otherId = room.otherParticipant(viewerUserId).getId();
        if (chatModerationService.isBlockedEitherWay(viewerUserId, otherId)) {
            throw new AccessDeniedException("차단된 상대와의 채팅방이에요.");
        }
    }

    private void assertSenderNotRestricted(Long senderUserId) {
        if (restrictionRepository.existsById(senderUserId)) {
            throw new ChatSenderRestrictedException();
        }
    }

    /**
     * 발신 가능 여부 lazy 판정(§4.6). 원본 매칭이 DECLINED/EXPIRED 로 확정된 지 유예기간이 지났으면
     * 그 자리에서 읽기 전용으로 전환하고 저장한다. ACCEPTED(또는 아직 유예기간 이내)면 계속 쓸 수 있다.
     */
    private void assertWritable(ChatRoom room) {
        if (room.isReadOnly()) {
            throw new ConflictException("이 채팅방은 읽기 전용이에요. 지난 대화만 확인할 수 있어요.", "CHAT_ROOM_READ_ONLY");
        }
        if (isGracePeriodElapsed(room)) {
            room.markReadOnly();
            chatRoomRepository.save(room);
            throw new ConflictException("이 채팅방은 읽기 전용이에요. 지난 대화만 확인할 수 있어요.", "CHAT_ROOM_READ_ONLY");
        }
    }

    private ChatRoomStatus resolveEffectiveStatus(ChatRoom room) {
        if (room.isReadOnly()) {
            return ChatRoomStatus.READ_ONLY;
        }
        return isGracePeriodElapsed(room) ? ChatRoomStatus.READ_ONLY : ChatRoomStatus.ACTIVE;
    }

    /**
     * OFFER 방향은 ACCEPTED 시점에만 채팅방이 열리므로(영구 활성) 이 판정 대상이 아니다. APPLICATION
     * 방향은 개설 시점에 이미 DECLINED 일 수 있어({@link JobApplicationService} 참고), 응답 시각
     * ({@link ChatRoom#getMatchedAt()}) 기준 유예기간 경과 여부만 본다 — 별도 만료 조회 없이 스냅샷
     * 시각만으로 판정 가능하다(원본 엔티티를 다시 로드할 필요 없음).
     */
    private boolean isGracePeriodElapsed(ChatRoom room) {
        if (room.getSourceType() != ChatSourceType.APPLICATION) {
            return false;
        }
        LocalDateTime graceDeadline = room.getMatchedAt().plusDays(readonlyGraceDays);
        return LocalDateTime.now(SEOUL).isAfter(graceDeadline);
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message, Long viewerUserId) {
        boolean mine = message.getSender() != null && message.getSender().getId().equals(viewerUserId);
        return new ChatMessageResponse(
                message.getId(),
                message.getChatRoom().getId(),
                message.getSender() == null ? null : message.getSender().getId(),
                message.getSender() == null ? null : message.getSender().getName(),
                message.getMessageType().name(),
                message.getContent(),
                message.isMasked(),
                mine,
                message.getSentAt(),
                message.getReadAt());
    }

    private Long resolveStoreOwnerUserId(Long storeId) {
        List<MasterStoreRelation> relations = masterStoreRelationRepository.findByStore_Id(storeId);
        return relations.isEmpty() ? null : relations.get(0).getMasterProfile().getId();
    }
}
