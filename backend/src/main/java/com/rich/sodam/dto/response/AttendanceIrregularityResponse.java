package com.rich.sodam.dto.response;

import com.rich.sodam.domain.AttendanceIrregularity;
import com.rich.sodam.domain.type.AttendanceIrregularityResolution;
import com.rich.sodam.domain.type.AttendanceIrregularityType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceIrregularityResponse(
        Long id,
        Long employeeId,
        String employeeName,
        Long storeId,
        LocalDate shiftDate,
        AttendanceIrregularityType type,
        int minutesShort,
        AttendanceIrregularityResolution resolution,
        Integer deductedAmount,
        String note,
        LocalDateTime resolvedAt
) {
    public static AttendanceIrregularityResponse of(AttendanceIrregularity a, String employeeName) {
        return new AttendanceIrregularityResponse(
                a.getId(), a.getEmployeeId(), employeeName, a.getStoreId(), a.getShiftDate(),
                a.getType(), a.getMinutesShort(), a.getResolution(), a.getDeductedAmount(),
                a.getNote(), a.getResolvedAt());
    }
}
