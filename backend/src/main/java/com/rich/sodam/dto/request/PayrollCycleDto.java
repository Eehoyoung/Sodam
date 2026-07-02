package com.rich.sodam.dto.request;

import com.rich.sodam.domain.MonthOffset;
import com.rich.sodam.domain.PayrollCycle;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 급여 정산 주기 요청 DTO. 매장 생성/수정 시 함께 전달된다.
 * '일'은 정수(1~31)로 받고, 도메인에서 2자리 문자열로 정규화한다.
 */
@Getter
@Setter
@NoArgsConstructor
public class PayrollCycleDto {

    @Schema(description = "정산 시작 기준월", example = "PREV_MONTH", allowableValues = {"PREV_MONTH", "CURRENT_MONTH"})
    private MonthOffset startOffset;

    @Schema(description = "정산 시작일(1~31)", example = "1")
    @Min(1) @Max(31)
    private Integer startDay;

    @Schema(description = "정산 마감 기준월", example = "CURRENT_MONTH", allowableValues = {"CURRENT_MONTH", "NEXT_MONTH"})
    private MonthOffset endOffset;

    @Schema(description = "정산 마감일(1~31). 말일이면 생략", example = "25")
    @Min(1) @Max(31)
    private Integer endDay;

    @Schema(description = "정산 마감을 그 달 말일로 할지 여부", example = "false")
    private Boolean endLastDay;

    @Schema(description = "급여 지급 기준월", example = "NEXT_MONTH", allowableValues = {"CURRENT_MONTH", "NEXT_MONTH"})
    private MonthOffset payOffset;

    @Schema(description = "급여 지급일(1~31). 말일이면 생략", example = "10")
    @Min(1) @Max(31)
    private Integer payDay;

    @Schema(description = "급여 지급을 그 달 말일로 할지 여부", example = "false")
    private Boolean payDayLastDay;

    /** 도메인 값 객체로 변환(검증·0 패딩 포함). */
    public PayrollCycle toDomain() {
        return PayrollCycle.of(
                startOffset, startDay,
                endOffset, endDay, Boolean.TRUE.equals(endLastDay),
                payOffset, payDay, Boolean.TRUE.equals(payDayLastDay));
    }
}
