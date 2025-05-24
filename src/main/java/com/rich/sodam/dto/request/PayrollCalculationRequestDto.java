package com.rich.sodam.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 급여 계산 요청을 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollCalculationRequestDto {

    @NotNull(message = "직원 ID는 필수 항목입니다")
    private Long employeeId;

    @NotNull(message = "매장 ID는 필수 항목입니다")
    private Long storeId;

    @NotNull(message = "시작일은 필수 항목입니다")
    private LocalDate startDate;

    @NotNull(message = "종료일은 필수 항목입니다")
    private LocalDate endDate;

    // 선택적 필드 - 기본값을 false로 설정
    private Boolean recalculate = false;
}