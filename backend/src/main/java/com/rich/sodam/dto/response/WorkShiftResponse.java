package com.rich.sodam.dto.response;

import com.rich.sodam.domain.WorkShift;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근무 시프트 응답 (B10/E-NEW-05).
 */
public record WorkShiftResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate shiftDate,
        LocalTime startTime,
        LocalTime endTime,
        String memo
) {
    public static WorkShiftResponse from(WorkShift s) {
        return new WorkShiftResponse(
                s.getId(),
                s.getEmployeeId(),
                s.getStoreId(),
                s.getShiftDate(),
                s.getStartTime(),
                s.getEndTime(),
                s.getMemo());
    }
}
