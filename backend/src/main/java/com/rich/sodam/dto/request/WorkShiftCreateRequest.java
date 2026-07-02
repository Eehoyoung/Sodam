package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근무 시프트 등록 요청 (B10/E-NEW-05). 사장 전용.
 */
@Getter
@Setter
public class WorkShiftCreateRequest {

    @NotNull(message = "직원을 선택해 주세요.")
    private Long employeeId;

    @NotNull(message = "근무 날짜를 입력해 주세요.")
    private LocalDate shiftDate;

    @NotNull(message = "시작 시간을 입력해 주세요.")
    private LocalTime startTime;

    @NotNull(message = "종료 시간을 입력해 주세요.")
    private LocalTime endTime;

    private String memo;
}
