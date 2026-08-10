package com.rich.sodam.dto.request;

import com.rich.sodam.core.payroll.constant.LaborStandards;
import com.rich.sodam.domain.type.TaxPolicyType;
import jakarta.validation.constraints.AssertTrue;
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

    // §50① 일 8시간이 상한이다. 예전 상한(12.0)은 이 제약에 완전히 가려지므로 남기지 않는다 —
    // 둘 다 두면 8.1~12.0 구간에서 메시지가 하나만, 12.0 초과에서 둘 다 뜬다.
    @DecimalMin(value = "1.0", message = "일일 기본 근무 시간은 최소 1.0 이상이어야 합니다")
    @DecimalMax(value = "8.0", message = "일 소정근로시간은 8시간을 넘을 수 없어요.")
    private Double regularHoursPerDay;

    private Boolean weeklyAllowanceEnabled;

    @AssertTrue(message = "야간근로 시작 시각은 22:00으로 고정돼요.")
    public boolean isNightWorkStartStatutory() {
        return nightWorkStartTime == null || nightWorkStartTime.equals(LaborStandards.NIGHT_START);
    }

}
