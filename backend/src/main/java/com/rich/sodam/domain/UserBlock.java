package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 차단(§4.4) — 채팅뿐 아니라 리스트·제안 전 구간의 상호 비노출에 쓰인다(단방향 저장,
 * 비노출 판정은 양방향으로 조회). 신고와 독립적으로 언제든 실행 가능하다(신고 없이 차단만도 지원).
 */
@Entity
@Table(name = "user_block", indexes = {
        @Index(name = "idx_user_block_blocked", columnList = "blocked_user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uq_user_block", columnNames = {"blocker_user_id", "blocked_user_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_user_id", nullable = false)
    private User blockerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_user_id", nullable = false)
    private User blockedUser;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private UserBlock(User blockerUser, User blockedUser) {
        this.blockerUser = blockerUser;
        this.blockedUser = blockedUser;
        this.createdAt = LocalDateTime.now();
    }

    public static UserBlock of(User blockerUser, User blockedUser) {
        return new UserBlock(blockerUser, blockedUser);
    }
}
