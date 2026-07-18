package com.rich.sodam.dto.request;

import com.rich.sodam.domain.type.EmploymentType;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record EmploymentAmendmentCreateRequest(
        @NotNull Long employeeId,
        @NotNull @FutureOrPresent LocalDate effectiveDate,
        @NotNull EmploymentType employmentType,
        @Positive Integer hourlyWage,
        @Positive Integer monthlySalary,
        @DecimalMin("0.1") @DecimalMax("52.0") Double contractedWeeklyHours,
        @Min(1) @Max(7) Integer contractedWeeklyDays
) {
    @AssertTrue(message = "시급제는 hourlyWage, 월급제는 monthlySalary가 필요합니다.")
    public boolean isCompensationValid() {
        return employmentType == null
                || (employmentType == EmploymentType.HOURLY ? hourlyWage != null : monthlySalary != null);
    }
}
