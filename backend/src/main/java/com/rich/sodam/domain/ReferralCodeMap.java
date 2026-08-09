package com.rich.sodam.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 무작위 추천 코드와 사용자 ID의 단방향 매핑.
 *
 * <p>코드를 역산하지 않고 고유 인덱스로 조회해 인증 전 요청도 일정 시간으로 처리한다.</p>
 */
@Entity
@Table(name = "referral_code_map", uniqueConstraints = {
        @UniqueConstraint(name = "uq_referral_code_map_code", columnNames = "code"),
        @UniqueConstraint(name = "uq_referral_code_map_user", columnNames = "user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReferralCodeMap {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "referral_code_map_id")
    private Long id;

    @Column(nullable = false, length = 8)
    private String code;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private ReferralCodeMap(String code, Long userId) {
        this.code = code;
        this.userId = userId;
    }

    public static ReferralCodeMap issue(String code, Long userId) {
        return new ReferralCodeMap(code, userId);
    }

    @PrePersist
    void initializeCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
