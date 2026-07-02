package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * JWT 리프레시 토큰 엔티티
 * 사용자의 리프레시 토큰 정보를 저장하고 관리합니다.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "refresh_token")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "refresh_token_id")
    private Long id;

    /**
     * 리프레시 토큰 값
     */
    @Column(nullable = false, unique = true, length = 500)
    private String token;

    /**
     * 토큰 소유자 (User와 연관관계)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 토큰 만료 시간
     */
    @Column(nullable = false)
    private LocalDateTime expiryDate;

    /**
     * 토큰 생성 시간
     */
    @Column(nullable = false)
    private LocalDateTime createdAt;

    /**
     * 토큰 사용 여부 (한 번 사용하면 무효화)
     */
    @Column(nullable = false)
    private boolean used = false;

    /**
     * 생성자
     *
     * @param token      리프레시 토큰 값
     * @param user       토큰 소유자
     * @param expiryDate 만료 시간
     */
    public RefreshToken(String token, User user, LocalDateTime expiryDate) {
        this.token = token;
        this.user = user;
        this.expiryDate = expiryDate;
        this.createdAt = LocalDateTime.now();
        this.used = false;
    }

    /**
     * 토큰이 만료되었는지 확인합니다.
     *
     * @return 만료 여부
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(this.expiryDate);
    }

    /**
     * 토큰을 사용 처리합니다.
     */
    public void markAsUsed() {
        this.used = true;
    }

    /**
     * 토큰이 유효한지 확인합니다.
     *
     * @return 유효성 여부
     */
    public boolean isValid() {
        return !used && !isExpired();
    }
}
