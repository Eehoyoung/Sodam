package com.rich.sodam.dto.response;

import com.rich.sodam.domain.type.EmploymentType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeWageInfoDto {
    private Long employeeId;
    private String employeeName;
    private Long storeId;
    private String storeName;
    private Integer storeStandardHourlyWage;
    private Integer customHourlyWage;
    private Boolean useStoreStandardWage;
    private Integer appliedHourlyWage;

    /** 고용형태 (HOURLY 시급제 / MONTHLY_SALARY 월급제). */
    private EmploymentType employmentType;
    /** 월급(원, 세전) — 월급제 전용, 시급제는 null. */
    private Integer monthlySalary;
    /** 개인별 4대보험 가입 여부 — null 이면 매장 정책 따름. */
    private Boolean socialInsuranceEnrolled;
}
