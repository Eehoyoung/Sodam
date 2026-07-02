package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 휴게시간 부여 증빙 (L-NEW-04, 근로기준법 §54). 사장이 "휴게를 실제로 줬다"는 기록.
 *
 * <p>주의: 임금계산과 무관하다. {@code Attendance}/{@code WorkHoursCalculator} 는 휴게시간을
 * 근로시간에서 <em>공제</em>하지만, §54 는 휴게를 <em>부여할 의무</em>를 부과한다.
 * 부여 증빙이 없으면 임금체불 진정 시 사장이 불리하므로, 임금계산과 별개로 부여 기록을 남긴다.
 *
 * <p>이 엔티티는 임금계산에 절대 참여하지 않는다(회귀 방지). 순수 증빙 전용.
 */
@Entity
@Table(name = "break_record", indexes = {
        @Index(name = "idx_break_emp_store_date", columnList = "employee_id, store_id, work_date"),
        @Index(name = "idx_break_store_date", columnList = "store_id, work_date")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BreakRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "break_record_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 휴게를 부여한 근무일. */
    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    /** 실제 부여한 휴게시간(분). */
    @Column(name = "break_minutes", nullable = false)
    private int breakMinutes;

    /** 부여 확인(사장이 실제 줬음을 확인). */
    @Column(name = "granted_confirmed", nullable = false)
    private boolean grantedConfirmed;

    @Column(name = "memo", length = 300)
    private String memo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private BreakRecord(Long employeeId, Long storeId, LocalDate workDate,
                        int breakMinutes, boolean grantedConfirmed, String memo) {
        this.employeeId = employeeId;
        this.storeId = storeId;
        this.workDate = workDate;
        this.breakMinutes = breakMinutes;
        this.grantedConfirmed = grantedConfirmed;
        this.memo = memo;
        this.createdAt = LocalDateTime.now();
    }

    public static BreakRecord create(Long employeeId, Long storeId, LocalDate workDate,
                                     int breakMinutes, boolean grantedConfirmed, String memo) {
        return new BreakRecord(employeeId, storeId, workDate, breakMinutes, grantedConfirmed, memo);
    }
}
