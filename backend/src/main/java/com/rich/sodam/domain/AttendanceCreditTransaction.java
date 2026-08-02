package com.rich.sodam.domain;

import com.rich.sodam.domain.type.AttendanceCreditTransactionReason;
import com.rich.sodam.domain.type.AttendanceCreditTransactionType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 출근권 거래 원장(append-only ledger) — 지급/소모/충전/환불 각 건을 기록한다
 * (recruitment-monetization-gamification-plan.md §2, §7).
 *
 * <p><b>lot 기반 FIFO 소모</b>: 공급성(양수) 거래({@code GRANT}/{@code TOPUP}/{@code REFUND})는
 * {@code remainingQuantity}를 함께 가진다("이 거래로 지급된 수량 중 아직 안 쓴 만큼"). 소모
 * ({@code CONSUME})는 만료 임박순({@code expiresAt} 오름차순, 무기한은 맨 뒤)으로 공급 lot의
 * {@code remainingQuantity}를 깎아나가는 FIFO 방식으로 처리한다 — 단순히 "만료된 거래를 통째로
 * 무효화"하면 부분 소모된 lot과 이중 차감되는 버그가 생기므로, 이 필드 없이는 지급-소모-만료가
 * 뒤섞일 때 잔액이 음수로 튀는 문제를 피할 수 없다({@code AttendanceCreditService} 설계 노트 참고).
 * {@code CONSUME} 거래는 remainingQuantity를 쓰지 않는다(null).</p>
 *
 * <p>만료(expiresAt) 도달 시 별도의 "EXPIRE" 원장 행을 새로 만들지 않는다 — 원 GRANT 행의
 * remainingQuantity를 0으로 줄이는 것 자체가 감사 기록이다(스펙상 유형은 지급/소모/충전/환불
 * 4종으로 한정되어 있어 5번째 유형을 추가하지 않는다).</p>
 */
@Entity
@Table(name = "attendance_credit_transaction", indexes = {
        @Index(name = "idx_act_owner_created", columnList = "owner_user_id, created_at"),
        @Index(name = "idx_act_owner_expires", columnList = "owner_user_id, expires_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceCreditTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceCreditTransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AttendanceCreditTransactionReason reason;

    /** 부호 있는 수량 — 지급/충전/환불은 양수, 소모는 음수. */
    @Column(nullable = false)
    private Integer quantity;

    /** 공급성(양수) 거래만 사용 — 아직 소모/만료되지 않고 남은 수량. 소모 거래는 null. */
    @Column(name = "remaining_quantity")
    private Integer remainingQuantity;

    /** null = 무기한(유료 충전/환불). 무료 지급분만 지급 시각 +30일(설정값) 로 채워진다. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 낙관적 락 — FIFO 소모 시 remainingQuantity 동시 수정 방지. */
    @Version
    @Column(nullable = false)
    private Long version;

    private AttendanceCreditTransaction(Long ownerUserId, AttendanceCreditTransactionType type,
                                         AttendanceCreditTransactionReason reason, int quantity,
                                         Integer remainingQuantity, LocalDateTime expiresAt,
                                         LocalDateTime createdAt) {
        this.ownerUserId = ownerUserId;
        this.type = type;
        this.reason = reason;
        this.quantity = quantity;
        this.remainingQuantity = remainingQuantity;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    /** 공급성 거래(지급/충전/환불) 생성 — quantity는 양수, remainingQuantity는 quantity로 초기화. */
    public static AttendanceCreditTransaction supply(Long ownerUserId, AttendanceCreditTransactionType type,
                                                       AttendanceCreditTransactionReason reason, int quantity,
                                                       LocalDateTime expiresAt, LocalDateTime now) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("지급 수량은 0보다 커야 해요.");
        }
        return new AttendanceCreditTransaction(ownerUserId, type, reason, quantity, quantity, expiresAt, now);
    }

    /** 소모 거래 생성 — quantity는 양수로 입력받아 내부적으로 음수 저장, remainingQuantity는 사용하지 않음(null). */
    public static AttendanceCreditTransaction consume(Long ownerUserId, AttendanceCreditTransactionReason reason,
                                                        int quantity, LocalDateTime now) {
        if (quantity <= 0) {
            throw new IllegalArgumentException("소모 수량은 0보다 커야 해요.");
        }
        return new AttendanceCreditTransaction(ownerUserId, AttendanceCreditTransactionType.CONSUME, reason,
                -quantity, null, null, now);
    }

    /** FIFO 소모/만료 스윕 — 이 lot에서 amount만큼 remainingQuantity를 깎는다(0 미만으로 내려가지 않게 방어). */
    public void drawDown(int amount) {
        if (remainingQuantity == null) {
            throw new IllegalStateException("소모 거래 행에는 lot 차감을 적용할 수 없어요.");
        }
        if (amount > remainingQuantity) {
            throw new IllegalStateException("lot 잔여 수량보다 많이 차감할 수 없어요.");
        }
        this.remainingQuantity -= amount;
    }

    public boolean isExpiredAsOf(LocalDateTime now) {
        return expiresAt != null && !expiresAt.isAfter(now);
    }
}
