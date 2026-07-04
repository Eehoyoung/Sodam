package com.rich.sodam.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AttendanceWorkLogResponse(
        Long employeeId,
        Long storeId,
        String storeName,
        int year,
        int month,
        Summary summary,
        List<Row> rows
) {
    public record Summary(
            int attendanceDays,
            int totalWorkedMinutes,
            int totalDailyWage,
            int totalBonusAmount,
            int totalGrossWage
    ) {
    }

    public record Row(
            Long attendanceId,
            LocalDate date,
            LocalDateTime checkInTime,
            LocalDateTime checkOutTime,
            Integer workedMinutes,
            Double workingHours,
            Integer appliedHourlyWage,
            Integer dailyWage,
            Integer bonusAmount,
            String bonusReason,
            String memo,
            String status
    ) {
    }
}
