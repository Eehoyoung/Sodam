package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근무 시프트 수정 요청 (B10/E-NEW-05). 사장 전용.
 *
 * <p>직원 재배정은 지원하지 않는다(삭제 후 재등록). 날짜·시각·메모만 변경.
 * 종료시각이 시작시각보다 빠르면 익일 종료(야간 근무)로 해석한다.
 */
@Getter
@Setter
public class WorkShiftUpdateRequest {

    @NotNull(message = "근무 날짜를 입력해 주세요.")
    private LocalDate shiftDate;

    @NotNull(message = "시작 시간을 입력해 주세요.")
    private LocalTime startTime;

    @NotNull(message = "종료 시간을 입력해 주세요.")
    private LocalTime endTime;

    private String memo;
}
