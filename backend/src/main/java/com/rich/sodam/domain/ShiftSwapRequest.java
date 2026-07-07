package com.rich.sodam.domain;

import com.rich.sodam.domain.type.SwapRequestStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 대타 모집 요청 — 사장이 특정 시프트를 대타 모집으로 전환한 건.
 *
 * <p>시프트당 OPEN 모집은 1건만(서비스에서 존재 체크). 직원 지원은
 * {@link ShiftSwapApplicant} 로 별도 적재하고, 사장이 승인하면 시프트의 배정 직원이
 * 승인자로 교체되고 상태가 FILLED 로 전이된다.
 *
 * <p>WorkShift 와 동일하게 employeeId/storeId 는 plain Long(EmployeeProfile.id == User.id).
 */
@Entity
@Table(name = "shift_swap_request", indexes = {
        @Index(name = "idx_ssr_store_status", columnList = "store_id, status"),
        @Index(name = "idx_ssr_shift", columnList = "shift_id"),
        @Index(name = "idx_shift_swap_request_original_employee_id", columnList = "original_employee_id"),
        @Index(name = "idx_shift_swap_request_approved_employee_id", columnList = "approved_employee_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShiftSwapRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shift_swap_request_id")
    private Long id;

    @Column(name = "shift_id", nullable = false)
    private Long shiftId;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /** 원 배정 직원(대타를 구하는 대상). 배정자 없는 시프트는 없지만 방어적으로 nullable. */
    @Column(name = "original_employee_id")
    private Long originalEmployeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private SwapRequestStatus status = SwapRequestStatus.OPEN;

    /** 승인된 대타 직원(FILLED 시 세팅). */
    @Column(name = "approved_employee_id")
    private Long approvedEmployeeId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private ShiftSwapRequest(Long shiftId, Long storeId, Long originalEmployeeId) {
        this.shiftId = shiftId;
        this.storeId = storeId;
        this.originalEmployeeId = originalEmployeeId;
        this.status = SwapRequestStatus.OPEN;
        this.createdAt = LocalDateTime.now();
    }

    public static ShiftSwapRequest open(Long shiftId, Long storeId, Long originalEmployeeId) {
        return new ShiftSwapRequest(shiftId, storeId, originalEmployeeId);
    }

    public boolean isOpen() {
        return this.status == SwapRequestStatus.OPEN;
    }

    /** 승인 — 대타 확정. OPEN 에서만 호출돼야 한다(서비스에서 상태 검증). */
    public void fill(Long approvedEmployeeId) {
        this.status = SwapRequestStatus.FILLED;
        this.approvedEmployeeId = approvedEmployeeId;
    }

    /** 모집 취소. */
    public void cancel() {
        this.status = SwapRequestStatus.CANCELLED;
    }
}
