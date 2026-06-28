package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 근무 시프트 (B10/E-NEW-05). 사장이 직원의 근무 일정을 등록하고 직원이 본인 일정을 조회.
 *
 * <p>스코프: 단순 시프트 등록·조회만. 채용·구인·자동배정 아님(Non-Goal).
 * 출퇴근 검증(Attendance)·급여 계산과 별개의 "예정 일정" 메타.
 */
@Entity
@Table(name = "work_shift", indexes = {
        @Index(name = "idx_work_shift_store_date", columnList = "store_id, shift_date"),
        @Index(name = "idx_work_shift_emp_date", columnList = "employee_id, shift_date")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "work_shift_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "memo", length = 200)
    private String memo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "confirmation_notification_sent_at")
    private LocalDateTime confirmationNotificationSentAt;

    private WorkShift(Long employeeId, Long storeId, LocalDate shiftDate,
                      LocalTime startTime, LocalTime endTime, String memo) {
        this.employeeId = employeeId;
        this.storeId = storeId;
        this.shiftDate = shiftDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.createdAt = LocalDateTime.now();
    }

    public static WorkShift create(Long employeeId, Long storeId, LocalDate shiftDate,
                                   LocalTime startTime, LocalTime endTime, String memo) {
        return new WorkShift(employeeId, storeId, shiftDate, startTime, endTime, memo);
    }

    public boolean isConfirmed() {
        return confirmedAt != null;
    }

    public void confirm() {
        if (this.confirmedAt == null) {
            this.confirmedAt = LocalDateTime.now();
        }
    }

    public boolean isConfirmationNotificationSent() {
        return confirmationNotificationSentAt != null;
    }

    public void markConfirmationNotificationSent() {
        if (this.confirmationNotificationSentAt == null) {
            this.confirmationNotificationSentAt = LocalDateTime.now();
        }
    }
}
