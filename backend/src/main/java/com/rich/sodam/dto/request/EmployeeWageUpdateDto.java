package com.rich.sodam.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.rich.sodam.domain.type.EmploymentType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 직원 임금 설정 변경 요청.
 *
 * <p>고용형태 필드 의미(하위호환 규칙):
 * <ul>
 *   <li>{@code employmentType == null} — 고용형태 관련 필드(형태·월급·보험) <b>변경 없음</b>.
 *       시급 필드만 갱신하는 기존 FE 호출이 월급제 설정을 덮어쓰지 않도록 한다.</li>
 *   <li>{@code employmentType != null} — 형태·월급·보험 세 필드를 일괄 적용.
 *       {@code socialInsuranceEnrolled = null} 은 "매장 정책 따름"으로 리셋.</li>
 * </ul></p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeWageUpdateDto {

    @NotNull(message = "employeeId는 필수입니다.")
    private Long employeeId;

    @NotNull(message = "storeId는 필수입니다.")
    private Long storeId;

    private Integer customHourlyWage;
    private Boolean useStoreStandardWage;

    /** 고용형태. null = 변경 없음(기존 유지). */
    private EmploymentType employmentType;

    /** 월급(원, 세전). MONTHLY_SALARY 설정 시 필수. */
    @Positive(message = "monthlySalary는 0보다 커야 합니다.")
    private Integer monthlySalary;

    /** 개인별 4대보험 가입 여부. null = 매장 정책(PayrollPolicy.taxPolicyType) 따름. */
    private Boolean socialInsuranceEnrolled;

    /** 월급제(MONTHLY_SALARY)로 설정하면서 월급을 누락하면 400 (Bean Validation). */
    @JsonIgnore
    @AssertTrue(message = "월급제(MONTHLY_SALARY)는 monthlySalary가 필수입니다.")
    public boolean isMonthlySalaryPresentForMonthlyType() {
        return employmentType != EmploymentType.MONTHLY_SALARY || monthlySalary != null;
    }
}
