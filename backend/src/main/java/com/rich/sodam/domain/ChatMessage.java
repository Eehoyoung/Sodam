package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ChatMessageType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 — 텍스트 전용(v1, §4.5 이미지 미지원).
 *
 * <p><b>PII 최소화</b>(security.md): 전화번호·계좌번호 패턴이 감지되면 저장 <b>전에</b>
 * {@code ChatMessageMasker}가 마스킹한 결과만 {@link #content}에 저장한다 — 원문은 어디에도
 * 남기지 않는다(§4.3 "막지 않고 왜 막혔는지 설명한다"는 UX 요구는 {@link #masked} 플래그로 FE가
 * 안내 배지를 그리는 방식으로 충족한다).</p>
 */
@Entity
@Table(name = "chat_message", indexes = {
        @Index(name = "idx_chat_message_room_sent", columnList = "chat_room_id, sent_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    /** 시스템 메시지는 발신자가 없다({@link ChatMessageType#SYSTEM}). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_user_id")
    private User sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private ChatMessageType messageType;

    /** 마스킹이 적용된(또는 애초에 마스킹 대상이 없던) 최종 저장 내용. 원문은 보관하지 않는다. */
    @Column(name = "content", nullable = false, length = 1000)
    private String content;

    /** 전화번호/계좌번호 패턴 감지로 마스킹이 실제로 적용됐는지(FE 안내 배지 트리거). */
    @Column(name = "masked", nullable = false)
    private boolean masked;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    private ChatMessage(ChatRoom chatRoom, User sender, ChatMessageType messageType, String content, boolean masked) {
        this.chatRoom = chatRoom;
        this.sender = sender;
        this.messageType = messageType;
        this.content = content;
        this.masked = masked;
        this.sentAt = LocalDateTime.now();
    }

    public static ChatMessage userMessage(ChatRoom chatRoom, User sender, String content, boolean masked) {
        return new ChatMessage(chatRoom, sender, ChatMessageType.USER, content, masked);
    }

    /** 시스템 안내 메시지(예: "신고가 접수됐어요" — §4.4). */
    public static ChatMessage systemMessage(ChatRoom chatRoom, String content) {
        return new ChatMessage(chatRoom, null, ChatMessageType.SYSTEM, content, false);
    }

    /** 읽음 처리 — 이미 읽었으면 재기록하지 않는다(최초 읽은 시각 유지). */
    public void markReadBy(Long readerUserId) {
        if (this.readAt != null) {
            return;
        }
        if (sender != null && sender.getId().equals(readerUserId)) {
            // 본인이 보낸 메시지는 "읽음" 대상이 아니다(상대가 읽었는지 표시하는 필드이므로).
            return;
        }
        this.readAt = LocalDateTime.now();
    }

    public boolean isSystemMessage() {
        return this.messageType == ChatMessageType.SYSTEM;
    }
}
