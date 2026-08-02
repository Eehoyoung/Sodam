package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 출근권 지갑(잔액 보유) — 사장(Master) 전용 채용 재화(recruitment-monetization-gamification-plan.md §2).
 *
 * <p>{@code ownerUserId}는 {@link User}(사장)의 PK(= {@link MasterProfile}의 PK와 동일값, {@code @MapsId}
 * 패턴)를 그대로 사용한다. {@code balance}는 "지급/소모 시점에만 갱신되는 캐시"다 — 무료 지급분의
 * 소멸(만료)은 이 컬럼을 곧바로 깎지 않고, {@link AttendanceCreditTransaction}의 lazy 판정
 * (JobOffer의 EXPIRED lazy 패턴과 동일 원칙)으로 조회 시점에 "유효 잔액"을 계산한다. 실제 컬럼 보정은
 * 다음 소모(consume)·체크인 시점에 원장을 스윕(sweep)하면서 반영된다(정확한 값은
 * {@code AttendanceCreditService.getSummary}가 계산해서 응답한다 — 이 컬럼을 그대로 신뢰하지 말 것).</p>
 *
 * <p>동시 소모 요청 방지를 위해 {@link Version} 낙관적 락을 건다(JobOffer/JobApplication 낙관적 락
 * 비대칭 이슈 재발 방지 — 처음부터 포함).</p>
 */
@Entity
@Table(name = "attendance_credit", uniqueConstraints = {
        @UniqueConstraint(name = "uq_attendance_credit_owner", columnNames = "owner_user_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceCredit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(nullable = false)
    private Integer balance;

    /** 연속 출석일수 — 하루라도 빠지면 1로 리셋(오늘 체크인 자체가 1일째). */
    @Column(name = "current_streak", nullable = false)
    private Integer currentStreak;

    /** 마지막 출석체크 날짜(Asia/Seoul 기준) — 중복 체크인 방지 1차 판정(빠른 경로), 최종 방어는 DB 유니크 제약. */
    @Column(name = "last_check_in_date")
    private LocalDate lastCheckInDate;

    /**
     * 스트릭 복구권(단품 티켓) 보유 수량 — 출근권(재화) {@link #balance}와는 별개 풀이다. 이 지갑의
     * FIFO 소모 원장({@link AttendanceCreditTransaction})은 "출근권 재화" 전용이라, 티켓을 같은
     * 원장에 섞으면 {@code findActiveLotsForConsumption}이 사유(reason) 구분 없이 lot을 끌어써 일반
     * 소모(제안발송 등)가 티켓 lot을 재화처럼 갉아먹는 정합성 버그가 생긴다 — 그래서 원장 밖의
     * 별도 카운터로 둔다. 실제 "스트릭 보호 적용" 소모 로직은 이번 범위 밖(훅만 마련).
     */
    @Column(name = "streak_recovery_tickets", nullable = false)
    private Integer streakRecoveryTickets;

    /**
     * 첫 구매 2배 이벤트 지급 완료 여부 — "출근권(재화)이 포함된" 첫 유료 충전 1건에만 적용되고
     * 이후 영구히 true로 고정된다(스트릭 복구권 단독 구매는 재화가 아니라 소모하지 않음 — §10 확인
     * 필요 항목으로 별도 보고). 잔액과 함께 같은 낙관적 락({@link #version})으로 보호된다.
     */
    @Column(name = "first_charge_bonus_granted", nullable = false)
    private Boolean firstChargeBonusGranted;

    /** 낙관적 락 — 동시 소모/지급 요청 방지. */
    @Version
    @Column(nullable = false)
    private Long version;

    private AttendanceCredit(Long ownerUserId) {
        this.ownerUserId = ownerUserId;
        this.balance = 0;
        this.currentStreak = 0;
        this.streakRecoveryTickets = 0;
        this.firstChargeBonusGranted = false;
    }

    public static AttendanceCredit openFor(Long ownerUserId) {
        return new AttendanceCredit(ownerUserId);
    }

    public boolean hasCheckedInOn(LocalDate date) {
        return lastCheckInDate != null && lastCheckInDate.equals(date);
    }

    /** 오늘 출석 처리 — 연속 스트릭 갱신만 담당(지급 수량 반영은 서비스가 {@link #addBalance}로 별도 호출). */
    public void recordCheckIn(LocalDate today) {
        if (lastCheckInDate != null && lastCheckInDate.equals(today.minusDays(1))) {
            this.currentStreak += 1;
        } else {
            this.currentStreak = 1;
        }
        this.lastCheckInDate = today;
    }

    public void addBalance(int amount) {
        this.balance += amount;
    }

    /** 잔액 차감 — 충분한지 여부(&gt;=0 유지)는 서비스 레이어가 사전에 검증한다(음수 방지는 방어적 가드). */
    public void subtractBalance(int amount) {
        if (this.balance - amount < 0) {
            throw new IllegalStateException("출근권 잔액이 음수가 될 수 없어요.");
        }
        this.balance -= amount;
    }

    /** 첫 구매 2배 이벤트가 아직 소진되지 않았는지(재화가 포함된 첫 유료 충전 1건 한정). */
    public boolean hasFirstChargeBonusAvailable() {
        return !Boolean.TRUE.equals(firstChargeBonusGranted);
    }

    /** 첫 구매 2배 이벤트를 소진 처리 — 이후 영구히 되돌리지 않는다(1회 한정). */
    public void markFirstChargeBonusGranted() {
        this.firstChargeBonusGranted = true;
    }

    /** 스트릭 복구권(단품 티켓) 지급 — 출근권 잔액과 별개 풀이라 원장을 거치지 않는다. */
    public void addStreakRecoveryTickets(int amount) {
        this.streakRecoveryTickets += amount;
    }

    /** 결제 취소/환불로 인한 티켓 회수(claw-back) — 0 미만으로 내려가지 않게 방어적으로 clamp. */
    public void reverseStreakRecoveryTickets(int amount) {
        this.streakRecoveryTickets = Math.max(0, this.streakRecoveryTickets - amount);
    }
}
