package com.rich.sodam.domain;

import com.rich.sodam.domain.type.AttendanceIrregularityResolution;
import com.rich.sodam.domain.type.AttendanceIrregularityType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 월급제 정규직의 지각/조퇴/결근 — 예정(WorkShift) 대비 실제(Attendance) 차이를 감지해 기록한다.
 *
 * <p>월급제는 결근·지각을 해도 월급이 고정이라 그대로 두면 무노동무임금 원칙에 어긋난다. 다만
 * 자동 감지가 즉시 공제로 이어지면 분쟁 소지가 크므로(사유에 따라 공제 여부가 달라짐), 감지는
 * 항상 {@link AttendanceIrregularityResolution#PENDING}으로 남고 사장이 명시적으로
 * 확정(공제/공제안함/연차전환)해야만 실제 급여에 반영된다.</p>
 *
 * <p>유일성은 (workShiftId, type) 조합 — 같은 시프트에서 지각과 조퇴가 동시에 발생할 수 있지만,
 * 같은 유형이 중복 생성되지는 않는다({@code AttendanceIrregularityRepository#existsByWorkShiftIdAndType}).
 * 이미 처리된(PENDING 이 아닌) 레코드는 재감지 대상에서 제외되어 사장의 확정 결과를 덮어쓰지 않는다.</p>
 */
@Entity
@Table(name = "attendance_irregularity", indexes = {
        @Index(name = "idx_air_employee_store", columnList = "employee_id, store_id"),
        @Index(name = "idx_air_shift_date", columnList = "shift_date"),
        @Index(name = "idx_air_resolution", columnList = "resolution"),
        @Index(name = "idx_attendance_irregularity_store_id", columnList = "store_id"),
        @Index(name = "idx_attendance_irregularity_attendance_id", columnList = "attendance_id"),
        @Index(name = "idx_attendance_irregularity_work_shift_id", columnList = "work_shift_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceIrregularity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "air_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "work_shift_id", nullable = false)
    private Long workShiftId;

    /** 결근이면 null(출근 기록 자체가 없음). */
    @Column(name = "attendance_id")
    private Long attendanceId;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceIrregularityType type;

    /** 미근로 시간(분). 지각/조퇴는 실제 차이, 결근은 예정 소정근로시간 전체. */
    @Column(name = "minutes_short", nullable = false)
    private int minutesShort;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceIrregularityResolution resolution = AttendanceIrregularityResolution.PENDING;

    /** resolution=DEDUCTED 일 때만 채워짐(원). */
    @Column(name = "deducted_amount")
    private Integer deductedAmount;

    @Column(length = 500)
    private String note;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public static AttendanceIrregularity detect(Long employeeId, Long storeId, Long workShiftId, Long attendanceId,
                                                 LocalDate shiftDate, AttendanceIrregularityType type, int minutesShort) {
        AttendanceIrregularity a = new AttendanceIrregularity();
        a.employeeId = employeeId;
        a.storeId = storeId;
        a.workShiftId = workShiftId;
        a.attendanceId = attendanceId;
        a.shiftDate = shiftDate;
        a.type = type;
        a.minutesShort = minutesShort;
        a.resolution = AttendanceIrregularityResolution.PENDING;
        a.detectedAt = LocalDateTime.now();
        return a;
    }

    public boolean isPending() {
        return resolution == AttendanceIrregularityResolution.PENDING;
    }

    public void waive(Long masterId, String note) {
        assertPending();
        this.resolution = AttendanceIrregularityResolution.WAIVED;
        this.note = note;
        this.resolvedBy = masterId;
        this.resolvedAt = LocalDateTime.now();
    }

    public void deduct(Long masterId, int amount, String note) {
        assertPending();
        this.resolution = AttendanceIrregularityResolution.DEDUCTED;
        this.deductedAmount = amount;
        this.note = note;
        this.resolvedBy = masterId;
        this.resolvedAt = LocalDateTime.now();
    }

    public void convertToLeave(Long masterId, String note) {
        assertPending();
        this.resolution = AttendanceIrregularityResolution.CONVERTED_TO_LEAVE;
        this.deductedAmount = 0;
        this.note = note;
        this.resolvedBy = masterId;
        this.resolvedAt = LocalDateTime.now();
    }

    private void assertPending() {
        if (resolution != AttendanceIrregularityResolution.PENDING) {
            throw new IllegalStateException("이미 처리된 근태 이상 건이에요.");
        }
    }
}
