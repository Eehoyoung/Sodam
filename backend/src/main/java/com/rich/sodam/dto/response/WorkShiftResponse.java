package com.rich.sodam.dto.response;

import com.rich.sodam.domain.WorkShift;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근무 시프트 응답 (B10/E-NEW-05).
 *
 * <p>{@code version}: 낙관적 락 버전(05_동시성제어_및_고급아키텍처.md §2.4). 클라이언트는 이 값을
 * 그대로 보관했다가 수정 요청({@code WorkShiftUpdateRequest.version})에 담아 보내야
 * 웹 콘솔·모바일 앱 동시 편집 충돌을 서버가 감지할 수 있다.
 */
public record WorkShiftResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate shiftDate,
        LocalTime startTime,
        LocalTime endTime,
        String memo,
        boolean crossesMidnight,
        Long version
) {
    public static WorkShiftResponse from(WorkShift s) {
        return new WorkShiftResponse(
                s.getId(),
                s.getEmployeeId(),
                s.getStoreId(),
                s.getShiftDate(),
                s.getStartTime(),
                s.getEndTime(),
                s.getMemo(),
                s.crossesMidnight(),
                s.getVersion());
    }
}
