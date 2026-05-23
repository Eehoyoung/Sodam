package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 모바일 디바이스 FCM 토큰.
 * 한 사용자가 여러 기기를 사용할 수 있으므로 1:N.
 * 마지막 활성화 시각을 기록해 60일 미사용 토큰은 정기 청소(추후 배치).
 */
@Entity
@Table(name = "device_token", indexes = {
        @Index(name = "idx_device_token_user", columnList = "user_id"),
        @Index(name = "idx_device_token_token", columnList = "token", unique = true)
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeviceToken {

    public enum Platform { ANDROID, IOS, WEB }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_token_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 500)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Platform platform;

    private LocalDateTime createdAt;
    private LocalDateTime lastSeenAt;

    public static DeviceToken of(User user, String token, Platform platform) {
        DeviceToken d = new DeviceToken();
        d.user = user;
        d.token = token;
        d.platform = platform;
        d.createdAt = LocalDateTime.now();
        d.lastSeenAt = d.createdAt;
        return d;
    }

    public void touch() {
        this.lastSeenAt = LocalDateTime.now();
    }
}
