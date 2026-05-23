package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 출퇴근 정정 요청 (직원 → 사장).
 * 상태: PENDING → APPROVED / REJECTED.
 *
 * 승인 시 BE 가 자동으로 해당 Attendance.checkInTime/checkOutTime 갱신.
 */
@Entity
@Table(name = "attendance_correction_request", indexes = {
        @Index(name = "idx_acr_attendance", columnList = "attendance_id"),
        @Index(name = "idx_acr_status", columnList = "status"),
        @Index(name = "idx_acr_requested_at", columnList = "requestedAt")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AttendanceCorrectionRequest {

    public enum Status { PENDING, APPROVED, REJECTED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "acr_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id", nullable = false)
    private Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    private LocalDateTime proposedCheckIn;
    private LocalDateTime proposedCheckOut;

    @Column(nullable = false, length = 200)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    private String rejectReason;

    @Column(nullable = false)
    private LocalDateTime requestedAt;
    private LocalDateTime decidedAt;

    public static AttendanceCorrectionRequest create(
            Attendance attendance, User requester,
            LocalDateTime proposedIn, LocalDateTime proposedOut, String reason) {
        AttendanceCorrectionRequest r = new AttendanceCorrectionRequest();
        r.attendance = attendance;
        r.requester = requester;
        r.proposedCheckIn = proposedIn;
        r.proposedCheckOut = proposedOut;
        r.reason = reason;
        r.status = Status.PENDING;
        r.requestedAt = LocalDateTime.now();
        return r;
    }

    public void approve() {
        this.status = Status.APPROVED;
        this.decidedAt = LocalDateTime.now();
    }

    public void reject(String why) {
        this.status = Status.REJECTED;
        this.rejectReason = why;
        this.decidedAt = LocalDateTime.now();
    }
}
