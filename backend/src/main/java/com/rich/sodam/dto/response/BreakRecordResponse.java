package com.rich.sodam.dto.response;

import com.rich.sodam.domain.BreakRecord;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 휴게 부여 증빙 응답 (L-NEW-04, §54).
 */
public record BreakRecordResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate workDate,
        int breakMinutes,
        boolean grantedConfirmed,
        String memo,
        LocalDateTime createdAt
) {
    public static BreakRecordResponse from(BreakRecord r) {
        return new BreakRecordResponse(
                r.getId(),
                r.getEmployeeId(),
                r.getStoreId(),
                r.getWorkDate(),
                r.getBreakMinutes(),
                r.isGrantedConfirmed(),
                r.getMemo(),
                r.getCreatedAt());
    }
}
