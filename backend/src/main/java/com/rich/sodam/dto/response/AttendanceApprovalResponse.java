package com.rich.sodam.dto.response;

import com.rich.sodam.domain.AttendanceApprovalRequest;

import java.time.LocalDateTime;

/**
 * 사장 승인 출퇴근 요청 응답.
 */
public record AttendanceApprovalResponse(
        Long id,
        Long employeeId,
        String employeeName,
        Long storeId,
        String type,
        LocalDateTime requestedTime,
        String status,
        Long resultAttendanceId,
        String rejectReason,
        LocalDateTime requestedAt,
        LocalDateTime decidedAt
) {
    public static AttendanceApprovalResponse of(AttendanceApprovalRequest r, String employeeName) {
        return new AttendanceApprovalResponse(
                r.getId(), r.getEmployeeId(), employeeName, r.getStoreId(),
                r.getType().name(), r.getRequestedTime(), r.getStatus().name(),
                r.getResultAttendanceId(), r.getRejectReason(),
                r.getRequestedAt(), r.getDecidedAt());
    }
}
