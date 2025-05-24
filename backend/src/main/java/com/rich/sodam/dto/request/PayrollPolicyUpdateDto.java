package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.TaxPolicyType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

/**
 * 급여 정책 업데이트를 위한 DTO 클래스
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayrollPolicyUpdateDto {

    @NotNull(message = "세금 정책 유형은 필수 항목입니다")
    private TaxPolicyType taxPolicyType;

    @DecimalMin(value = "1.0", message = "야간 근무 가산율은 최소 1.0 이상이어야 합니다")
    @DecimalMax(value = "3.0", message = "야간 근무 가산율은 최대 3.0 이하여야 합니다")
    private Double nightWorkRate;

    private LocalTime nightWorkStartTime;

    @DecimalMin(value = "1.0", message = "초과 근무 가산율은 최소 1.0 이상이어야 합니다")
    @DecimalMax(value = "3.0", message = "초과 근무 가산율은 최대 3.0 이하여야 합니다")
    private Double overtimeRate;

    @DecimalMin(value = "1.0", message = "일일 기본 근무 시간은 최소 1.0 이상이어야 합니다")
    @DecimalMax(value = "12.0", message = "일일 기본 근무 시간은 최대 12.0 이하여야 합니다")
    private Double regularHoursPerDay;

    private Boolean weeklyAllowanceEnabled;
}