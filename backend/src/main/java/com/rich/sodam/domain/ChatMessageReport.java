package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ChatReportReason;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채팅 메시지 단위 신고(§4.4) — 사람 전체가 아니라 문제가 된 메시지 하나를 짚는다.
 *
 * <p>같은 신고자가 같은 메시지를 중복 신고하지 못하도록 {@code (message_id, reporter_user_id)}
 * 유니크 제약을 건다(V73). 누적 임계치 판정은 "서로 다른 신고자" 수를 발신자 단위로 집계하므로
 * ({@link com.rich.sodam.repository.ChatMessageReportRepository#countDistinctReportersForSender})
 * 이 제약이 없으면 한 신고자가 여러 메시지를 반복 신고해 카운트를 부풀릴 수 있다.</p>
 */
@Entity
@Table(name = "chat_message_report", uniqueConstraints = {
        @UniqueConstraint(name = "uq_chat_message_report", columnNames = {"message_id", "reporter_user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessageReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private ChatMessage message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_user_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 30)
    private ChatReportReason reason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private ChatMessageReport(ChatMessage message, User reporter, ChatReportReason reason) {
        this.message = message;
        this.reporter = reporter;
        this.reason = reason;
        this.createdAt = LocalDateTime.now();
    }

    public static ChatMessageReport of(ChatMessage message, User reporter, ChatReportReason reason) {
        return new ChatMessageReport(message, reporter, reason);
    }
}
