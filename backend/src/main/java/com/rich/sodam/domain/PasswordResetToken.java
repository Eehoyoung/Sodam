package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 비밀번호 재설정 OTP 토큰.
 * 보안:
 *  - OTP 평문 미저장 (해시만)
 *  - 5분 만료
 *  - 1회 사용
 *  - 단일 활성 토큰 (이메일당 새 발급 시 이전 무효화)
 */
@Entity
@Table(name = "password_reset_token", indexes = {
        @Index(name = "idx_pwd_reset_email", columnList = "email"),
        @Index(name = "idx_pwd_reset_code_hash", columnList = "codeHash", unique = true),
        @Index(name = "idx_pwd_reset_expires_at", columnList = "expiresAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "password_reset_token_id")
    private Long id;

    @Column(nullable = false, length = 100)
    private String email;

    /** SHA-256(salt + code) — 평문 OTP 미저장 */
    @Column(nullable = false, unique = true, length = 200)
    private String codeHash;

    /** 추가 발급용 일회용 토큰 (Confirm 단계에서 사용) */
    @Column(nullable = false, unique = true, length = 100)
    private String resetTicket;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public static PasswordResetToken create(String email, String codeHash, int validMinutes) {
        PasswordResetToken t = new PasswordResetToken();
        t.email = email;
        t.codeHash = codeHash;
        t.resetTicket = UUID.randomUUID().toString().replace("-", "");
        t.expiresAt = LocalDateTime.now().plusMinutes(validMinutes);
        t.used = false;
        t.createdAt = LocalDateTime.now();
        return t;
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public void markUsed() {
        this.used = true;
    }
}
