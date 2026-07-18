package com.rich.sodam.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대타 모집 지원자 — (swap_request_id, employee_id) 유니크로 중복 지원을 DB 레벨에서도 차단.
 */
@Entity
@Table(name = "shift_swap_applicant",
        indexes = @Index(name = "idx_shift_swap_applicant_employee_id", columnList = "employee_id"),
        uniqueConstraints = @UniqueConstraint(name = "uk_ssa_request_employee",
                columnNames = {"swap_request_id", "employee_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShiftSwapApplicant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_swap_applicant_id")
    private Long id;

    @Column(name = "swap_request_id", nullable = false)
    private Long swapRequestId;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    private ShiftSwapApplicant(Long swapRequestId, Long employeeId) {
        this.swapRequestId = swapRequestId;
        this.employeeId = employeeId;
        this.appliedAt = LocalDateTime.now();
    }

    public static ShiftSwapApplicant of(Long swapRequestId, Long employeeId) {
        return new ShiftSwapApplicant(swapRequestId, employeeId);
    }
}
