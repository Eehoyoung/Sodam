package com.rich.sodam.dto.response;

import com.rich.sodam.domain.BreakRecord;
import com.rich.sodam.domain.type.RecordedBy;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 휴게 부여/기록 응답 (L-NEW-04, §54).
 *
 * <p>recordedBy=MASTER(사장 사후입력)이면 breakStartTime/breakEndTime 은 항상 null(기존 동작 불변).
 * recordedBy=EMPLOYEE(직원 실시간 기록)이면 시작만 하고 아직 종료 전일 때 breakEndTime 이 null —
 * FE 는 이 값으로 "휴게 진행 중" 여부를 판단할 수 있다.
 */
public record BreakRecordResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate workDate,
        int breakMinutes,
        boolean grantedConfirmed,
        String memo,
        RecordedBy recordedBy,
        LocalDateTime breakStartTime,
        LocalDateTime breakEndTime,
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
                r.getRecordedBy(),
                r.getBreakStartTime(),
                r.getBreakEndTime(),
                r.getCreatedAt());
    }
}
