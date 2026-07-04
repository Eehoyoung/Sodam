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

    /**
     * 일정 변경. 시각/날짜/메모를 갱신한다.
     *
     * <p>확정·알림 상태를 리셋하는 이유: 직원에게 이미 통보된 시각이 바뀌면 "확정"의 의미가 깨진다.
     * 변경 후에는 다시 미확정 상태가 되어 사장이 재확정·재알림해야 직원이 새 시각을 통보받는다.
     */
    public void update(LocalDate shiftDate, LocalTime startTime, LocalTime endTime, String memo) {
        this.shiftDate = shiftDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.memo = memo;
        this.confirmedAt = null;
        this.confirmationNotificationSentAt = null;
    }

    /**
     * 배정 직원 교체(대타 승인). 날짜·시각은 그대로 두고 담당자만 바꾼다.
     *
     * <p>확정 상태를 유지하는 이유: 대타 승인 흐름에서는 새 담당자에게 "대타 확정" 푸시가
     * 즉시 발송되므로(ShiftSwapService) 재확정·재알림 사이클이 불필요하다.
     */
    public void reassignTo(Long newEmployeeId) {
        this.employeeId = newEmployeeId;
    }

    /**
     * 자정을 넘기는 야간 근무인지. 종료시각이 시작시각보다 같거나 빠르면 익일 종료(예 18:00~02:00).
     * (동일 시각은 서비스 검증에서 거부하므로 여기 도달 시 end&lt;start = 익일.)
     */
    public boolean crossesMidnight() {
        return endTime != null && startTime != null && !endTime.isAfter(startTime);
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
