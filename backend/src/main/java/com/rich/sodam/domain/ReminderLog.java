package com.rich.sodam.domain;

import com.rich.sodam.domain.type.ReminderType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사장 리마인더 발송 이력 — 배치 재실행 시 중복 발송을 막는 멱등성 키.
 *
 * <p>(store_id, reminder_type, target_date) 유니크. 발송 전 존재 체크 → 발송 후 기록.
 * 같은 날 배치가 여러 번 돌아도(10분 주기 등) 매장·유형·대상일당 1회만 발송된다.
 */
@Entity
@Table(name = "reminder_log",
        uniqueConstraints = @UniqueConstraint(name = "uk_reminder_log_store_type_date_ref",
                columnNames = {"store_id", "reminder_type", "target_date", "ref_id"}))
@Getter
@NoArgsConstructor
public class ReminderLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reminder_log_id")
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reminder_type", nullable = false, length = 30)
    private ReminderType reminderType;

    /** 리마인더 대상일(예: 매출 입력 대상 날짜, 급여 지급일, 주간 리포트 주 시작일). */
    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    /**
     * 리마인더 참조 ID — 같은 날 같은 매장에서 대상별(예: 시프트별 지각 감지)로 따로 발송해야
     * 하는 룰의 멱등키 확장. SHIFT_LATE = work_shift_id. 기존 룰(매출/급여일/주간리포트)은 NULL.
     */
    @Column(name = "ref_id")
    private Long refId;

    private LocalDateTime createdAt;

    public ReminderLog(Long storeId, ReminderType reminderType, LocalDate targetDate) {
        this(storeId, reminderType, targetDate, null);
    }

    public ReminderLog(Long storeId, ReminderType reminderType, LocalDate targetDate, Long refId) {
        this.storeId = storeId;
        this.reminderType = reminderType;
        this.targetDate = targetDate;
        this.refId = refId;
    }

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
