package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 채팅 발신 자동 제한(§4.4) — 서로 다른 신고자로부터 임계치 이상 누적 신고를 받은 계정을
 * 운영 검토 큐로 이관한다. <b>자동 영구정지가 아니다</b>: 이 행 존재 자체가 "발신 제한 + 검토 대기"
 * 플래그이며, 해제(운영자 최종 판단)는 이번 범위 밖(별도 운영자 대시보드, §4.4 후속 백로그)이라
 * 상태 컬럼 없이 존재 여부만으로 판정한다.
 */
@Entity
@Table(name = "chat_user_restriction")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatUserRestriction {

    /** 제한 대상 사용자 — {@code user.user_id}를 그대로 PK로 사용(1:1). */
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "restricted_at", nullable = false)
    private LocalDateTime restrictedAt;

    /** 제한 시점의 서로 다른 신고자 수(감사 기록용 스냅샷). */
    @Column(name = "report_count", nullable = false)
    private int reportCount;

    private ChatUserRestriction(Long userId, int reportCount) {
        this.userId = userId;
        this.reportCount = reportCount;
        this.restrictedAt = LocalDateTime.now();
    }

    public static ChatUserRestriction of(Long userId, int reportCount) {
        return new ChatUserRestriction(userId, reportCount);
    }
}
