package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 휴게 부여 증빙 추가 요청 (L-NEW-04, §54). 실제 부여한 휴게시간 기록.
 */
@Getter
@Setter
public class BreakRecordCreateRequest {

    @NotNull(message = "근무일을 선택해 주세요.")
    private LocalDate workDate;

    @Positive(message = "휴게시간(분)을 입력해 주세요.")
    private int breakMinutes;

    /** 부여 확인(사장이 실제 줬음을 확인). 기본 true. */
    private boolean grantedConfirmed = true;

    private String memo;
}
