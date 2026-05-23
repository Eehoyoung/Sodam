package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 친구 추천 (PRD_OWNER A60·A61, PRD_EMPLOYEE E-A60·E-A61).
 *
 * 흐름:
 *   1. 사용자가 추천 코드 발급 (개인당 1개, 고정)
 *   2. 친구가 가입 시 코드 입력 → Referral 레코드 생성 (REGISTERED)
 *   3. 친구가 첫 결제 완료 → CONVERTED 로 전이 + 보상 (양쪽 1개월 무료 — 적용은 Subscription 정책)
 */
@Entity
@Table(name = "referral", indexes = {
        @Index(name = "idx_referral_code", columnList = "referralCode", unique = true),
        @Index(name = "idx_referral_referrer", columnList = "referrer_user_id"),
        @Index(name = "idx_referral_referee", columnList = "referee_user_id"),
        @Index(name = "idx_referral_status", columnList = "status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Referral {

    public enum Status { REGISTERED, CONVERTED, EXPIRED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "referral_id")
    private Long id;

    /** 추천한 사람의 코드 (영문+숫자 8자리). 사용자당 1개 고정 발급. */
    @Column(name = "referral_code", length = 16, nullable = false)
    private String referralCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referrer_user_id", nullable = false)
    private User referrer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referee_user_id", nullable = false)
    private User referee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(nullable = false)
    private LocalDateTime registeredAt;

    private LocalDateTime convertedAt;

    public static Referral register(String code, User referrer, User referee) {
        Referral r = new Referral();
        r.referralCode = code;
        r.referrer = referrer;
        r.referee = referee;
        r.status = Status.REGISTERED;
        r.registeredAt = LocalDateTime.now();
        return r;
    }

    public void convert() {
        if (this.status != Status.REGISTERED) return;
        this.status = Status.CONVERTED;
        this.convertedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = Status.CANCELLED;
    }
}
