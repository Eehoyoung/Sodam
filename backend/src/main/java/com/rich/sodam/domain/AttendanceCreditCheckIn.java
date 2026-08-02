package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사장 일일 출석체크 로그 — 하루 1건(unique)으로 "이번 사용자가 이 날짜에 체크인함"을 기록한다
 * (recruitment-monetization-gamification-plan.md §5). 마이페이지 "이번 주 월~일 그리드" 조회와
 * 중복 체크인 최종 방어(DB 유니크 제약)를 겸한다 — JobOffer의 pending_dedup_key와 동일하게
 * "서비스 사전 체크 + DB 유니크 제약"의 이중 방어 패턴을 따른다.
 */
@Entity
@Table(name = "attendance_credit_check_in", uniqueConstraints = {
        @UniqueConstraint(name = "uq_attendance_credit_check_in", columnNames = {"owner_user_id", "check_in_date"})
}, indexes = {
        @Index(name = "idx_acci_owner_date", columnList = "owner_user_id, check_in_date")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceCreditCheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "granted_quantity", nullable = false)
    private Integer grantedQuantity;

    @Column(name = "streak_bonus_granted", nullable = false)
    private boolean streakBonusGranted;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private AttendanceCreditCheckIn(Long ownerUserId, LocalDate checkInDate, int grantedQuantity,
                                     boolean streakBonusGranted, LocalDateTime createdAt) {
        this.ownerUserId = ownerUserId;
        this.checkInDate = checkInDate;
        this.grantedQuantity = grantedQuantity;
        this.streakBonusGranted = streakBonusGranted;
        this.createdAt = createdAt;
    }

    public static AttendanceCreditCheckIn of(Long ownerUserId, LocalDate checkInDate, int grantedQuantity,
                                              boolean streakBonusGranted, LocalDateTime now) {
        return new AttendanceCreditCheckIn(ownerUserId, checkInDate, grantedQuantity, streakBonusGranted, now);
    }
}
