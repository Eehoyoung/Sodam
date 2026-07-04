package com.rich.sodam.dto.response;

import com.rich.sodam.domain.ShiftSwapRequest;
import com.rich.sodam.domain.WorkShift;
import com.rich.sodam.domain.type.SwapRequestStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 대타 모집 응답 — 시프트 날짜/시간과 지원자 목록 포함.
 */
public record ShiftSwapRequestResponse(
        Long id,
        Long shiftId,
        Long storeId,
        Long originalEmployeeId,
        SwapRequestStatus status,
        Long approvedEmployeeId,
        LocalDate shiftDate,
        LocalTime startTime,
        LocalTime endTime,
        LocalDateTime createdAt,
        List<Applicant> applicants
) {

    /** 지원자(id=직원 ID, 이름, 지원 시각). */
    public record Applicant(Long id, String name, LocalDateTime appliedAt) {
    }

    public static ShiftSwapRequestResponse of(ShiftSwapRequest req, WorkShift shift, List<Applicant> applicants) {
        return new ShiftSwapRequestResponse(
                req.getId(),
                req.getShiftId(),
                req.getStoreId(),
                req.getOriginalEmployeeId(),
                req.getStatus(),
                req.getApprovedEmployeeId(),
                shift != null ? shift.getShiftDate() : null,
                shift != null ? shift.getStartTime() : null,
                shift != null ? shift.getEndTime() : null,
                req.getCreatedAt(),
                applicants);
    }
}
