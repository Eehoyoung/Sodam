package com.rich.sodam.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeWageUpdateDto {
    private Long employeeId;
    private Long storeId;
    private Integer customHourlyWage;
    private Boolean useStoreStandardWage;
}