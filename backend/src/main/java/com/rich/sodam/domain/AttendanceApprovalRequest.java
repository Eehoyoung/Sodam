package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사장 승인 출퇴근 요청 (위치/NFC 없이 사장 승인으로 출퇴근).
 *
 * <p>직원이 "출근/퇴근 처리 요청" 버튼을 누르면 PENDING 으로 생성되고, 그 시점({@code requestedTime})이
 * 실제 출퇴근 시각이 된다. 사장이 승인하면 BE 가 그 시각으로 Attendance 를 기록한다(요청 시각 보존).
 *
 * <p>WorkShift 와 동일하게 employeeId/storeId 는 plain Long(EmployeeProfile.id == User.id, @MapsId).
 */
@Entity
@Table(name = "attendance_approval_request", indexes = {
        @Index(name = "idx_aar_store_status", columnList = "store_id, status"),
        @Index(name = "idx_aar_employee", columnList = "employee_id"),
        @Index(name = "idx_aar_requested_at", columnList = "requested_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceApprovalRequest {

    public enum Type { CHECK_IN, CHECK_OUT }

    public enum Status { PENDING, APPROVED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "aar_id")
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 10)
    private Type type;

    /** 직원이 버튼을 누른 시각 — 승인 시 이 시각으로 출퇴근 기록(요청 시각 보존). */
    @Column(name = "requested_time", nullable = false)
    private LocalDateTime requestedTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private Status status = Status.PENDING;

    /** 승인 시 생성/갱신된 Attendance id. */
    @Column(name = "result_attendance_id")
    private Long resultAttendanceId;

    @Column(name = "reject_reason", length = 200)
    private String rejectReason;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    private AttendanceApprovalRequest(Long employeeId, Long storeId, Type type, LocalDateTime requestedTime) {
        this.employeeId = employeeId;
        this.storeId = storeId;
        this.type = type;
        this.requestedTime = requestedTime;
        this.status = Status.PENDING;
        this.requestedAt = LocalDateTime.now();
    }

    public static AttendanceApprovalRequest create(Long employeeId, Long storeId, Type type, LocalDateTime requestedTime) {
        return new AttendanceApprovalRequest(employeeId, storeId, type, requestedTime);
    }

    public void approve(Long resultAttendanceId) {
        this.status = Status.APPROVED;
        this.resultAttendanceId = resultAttendanceId;
        this.decidedAt = LocalDateTime.now();
    }

    public void reject(String reason) {
        this.status = Status.REJECTED;
        this.rejectReason = reason;
        this.decidedAt = LocalDateTime.now();
    }

    public boolean isPending() {
        return this.status == Status.PENDING;
    }
}
