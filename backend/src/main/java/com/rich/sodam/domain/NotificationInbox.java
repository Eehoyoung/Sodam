package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 사용자별 알림 이력 (E-501 알림 센터).
 * NotificationService 가 발송할 때 동시 기록 (best-effort).
 *
 * 보관기간은 카테고리별로 다르다(DB_OPTIMIZATION_PLAN.md §2.5, Phase 4) —
 * ATTENDANCE/PAYROLL/NOTICE 3년, BILLING 5년, MARKETING/SYSTEM 1년.
 * {@code com.rich.sodam.service.retention} 패키지의 정책 3개가 처리한다.
 */
@Entity
@Table(name = "notification_inbox", indexes = {
        @Index(name = "idx_notif_inbox_user", columnList = "user_id, createdAt"),
        @Index(name = "idx_notif_inbox_read", columnList = "user_id, isRead")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationInbox {

    public enum Category { ATTENDANCE, PAYROLL, BILLING, NOTICE, MARKETING, SYSTEM }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_inbox_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Category category;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, length = 300)
    private String body;

    @Column(length = 300)
    private String deepLink;

    @Setter
    @Column(nullable = false)
    private boolean isRead = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime readAt;

    public static NotificationInbox of(User user, Category category, String title, String body, String deepLink) {
        NotificationInbox n = new NotificationInbox();
        n.user = user;
        n.category = category;
        n.title = title;
        n.body = body;
        n.deepLink = deepLink;
        n.createdAt = LocalDateTime.now();
        n.isRead = false;
        return n;
    }

    public void markRead() {
        if (!this.isRead) {
            this.isRead = true;
            this.readAt = LocalDateTime.now();
        }
    }
}
