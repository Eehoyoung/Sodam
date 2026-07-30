package com.rich.sodam.domain;

import com.rich.sodam.domain.type.RecordedBy;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 휴게시간 부여 증빙 (L-NEW-04, 근로기준법 §54). 사장이 "휴게를 실제로 줬다"는 기록이자,
 * 직원이 실시간으로 본인의 휴게 시작/종료를 남기는 기록.
 *
 * <p>주의: 임금계산과 무관하다. {@code Attendance}/{@code WorkHoursCalculator} 는 휴게시간을
 * 근로시간에서 <em>공제</em>하지만, §54 는 휴게를 <em>부여할 의무</em>를 부과한다.
 * 부여 증빙이 없으면 임금체불 진정 시 사장이 불리하므로, 임금계산과 별개로 부여 기록을 남긴다.
 *
 * <p>이 엔티티는 임금계산에 절대 참여하지 않는다(회귀 방지). 순수 증빙/기록 전용.
 *
 * <p>{@link #create}(사장 사후입력)와 {@link #startByEmployee}+{@link #completeByEmployee}(직원 실시간
 * 기록)의 두 경로가 있다. {@code recordedBy} 로 출처를 구분하며, 직원 경로는 {@code breakStartTime}만
 * 채운 행을 만든 뒤 종료 시점에 {@code breakEndTime}과 {@code breakMinutes}를 자동 계산해 채운다.
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

    /** 이 기록을 누가 남겼는지(사장 사후입력 / 직원 실시간 기록). */
    @Enumerated(EnumType.STRING)
    @Column(name = "recorded_by", nullable = false, length = 20)
    private RecordedBy recordedBy;

    /** 직원 실시간 기록 전용 — 휴게 시작 시각. 사장 사후입력 경로는 null. */
    @Column(name = "break_start_time")
    private LocalDateTime breakStartTime;

    /** 직원 실시간 기록 전용 — 휴게 종료 시각. 시작만 하고 아직 종료 안 하면 null(진행 중). */
    @Column(name = "break_end_time")
    private LocalDateTime breakEndTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 낙관적 락(웹 콘솔·모바일 동시 편집 충돌 감지용, 06_DB_마이그레이션계획.md §2.1). */
    @Version
    @Column(nullable = false)
    private Long version;

    private BreakRecord(Long employeeId, Long storeId, LocalDate workDate,
                        int breakMinutes, boolean grantedConfirmed, String memo,
                        RecordedBy recordedBy, LocalDateTime breakStartTime, LocalDateTime breakEndTime) {
        this.employeeId = employeeId;
        this.storeId = storeId;
        this.workDate = workDate;
        this.breakMinutes = breakMinutes;
        this.grantedConfirmed = grantedConfirmed;
        this.memo = memo;
        this.recordedBy = recordedBy;
        this.breakStartTime = breakStartTime;
        this.breakEndTime = breakEndTime;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 사장의 사후 부여 증빙 입력 (기존 경로, 하위호환 — 시그니처 불변).
     */
    public static BreakRecord create(Long employeeId, Long storeId, LocalDate workDate,
                                     int breakMinutes, boolean grantedConfirmed, String memo) {
        return new BreakRecord(employeeId, storeId, workDate, breakMinutes, grantedConfirmed, memo,
                RecordedBy.MASTER, null, null);
    }

    /**
     * 직원이 앱에서 휴게 시작을 실시간으로 기록. breakMinutes 는 종료 시점까지 0(미확정), grantedConfirmed
     * 는 종료 전이라 아직 의미가 없으므로 false — {@link #completeByEmployee} 에서 true 로 고정된다.
     *
     * <p>workDate 는 시작 시각의 달력일 기준(근무일이 자정을 넘겨도 시작일을 유지). 종료 시각이 자정을
     * 넘기더라도(예: 23:50 시작 → 00:10 종료) breakMinutes 계산은 LocalDateTime 간 Duration 이라
     * 날짜 경계와 무관하게 정확하다.
     */
    public static BreakRecord startByEmployee(Long employeeId, Long storeId, LocalDateTime breakStartTime) {
        if (breakStartTime == null) {
            throw new IllegalArgumentException("휴게 시작 시각이 필요해요.");
        }
        return new BreakRecord(employeeId, storeId, breakStartTime.toLocalDate(),
                0, false, null, RecordedBy.EMPLOYEE, breakStartTime, null);
    }

    /**
     * 직원이 앱에서 휴게 종료를 기록 — 같은 행의 breakEndTime 을 채우고 breakMinutes 를 자동 계산한다.
     * grantedConfirmed 는 직원 본인이 실제로 휴게를 사용/종료했다는 자기 확인 의미로 true 로 고정한다
     * (사장의 사후 "부여 확인"과는 성격이 다르지만, 별도 상태를 추가하기보다 기존 필드를 재사용).
     */
    public void completeByEmployee(LocalDateTime breakEndTime) {
        if (this.recordedBy != RecordedBy.EMPLOYEE || this.breakStartTime == null) {
            throw new IllegalStateException("직원 실시간 기록이 아니에요.");
        }
        if (this.breakEndTime != null) {
            throw new IllegalStateException("이미 종료된 휴게 기록이에요.");
        }
        if (breakEndTime == null || !breakEndTime.isAfter(this.breakStartTime)) {
            throw new IllegalArgumentException("휴게 종료 시각은 시작 시각 이후여야 해요.");
        }
        this.breakEndTime = breakEndTime;
        this.breakMinutes = (int) Duration.between(this.breakStartTime, breakEndTime).toMinutes();
        this.grantedConfirmed = true;
    }

    /** 종료되지 않은(진행 중인) 직원 실시간 기록인지. */
    public boolean isInProgress() {
        return this.recordedBy == RecordedBy.EMPLOYEE && this.breakEndTime == null;
    }
}
