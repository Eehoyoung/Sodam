package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 근무 시프트 확정 알림 요청. 사장이 좁은 기간을 지정해 즉시 알림을 보낸다.
 */
@Getter
@Setter
public class WorkShiftNotifyRequest {

    @NotNull(message = "시작일을 입력해 주세요.")
    private LocalDate from;

    @NotNull(message = "종료일을 입력해 주세요.")
    private LocalDate to;
}
