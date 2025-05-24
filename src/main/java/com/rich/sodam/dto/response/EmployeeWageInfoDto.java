package com.rich.sodam.dto.response;

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
}