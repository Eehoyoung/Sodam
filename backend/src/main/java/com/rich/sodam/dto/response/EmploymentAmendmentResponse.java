package com.rich.sodam.dto.response;

import com.rich.sodam.domain.EmploymentAmendment;
import com.rich.sodam.domain.type.EmploymentAmendmentStatus;
import com.rich.sodam.domain.type.EmploymentType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmploymentAmendmentResponse(
        Long id, Long storeId, Long employeeId, LocalDate effectiveDate,
        EmploymentType employmentType, Integer hourlyWage, Integer monthlySalary,
        Double contractedWeeklyHours, Integer contractedWeeklyDays,
        EmploymentAmendmentStatus status, Long electronicSignatureEnvelopeId,
        int documentVersion, LocalDateTime verifiedAt, LocalDateTime appliedAt
) {
    public static EmploymentAmendmentResponse from(EmploymentAmendment amendment) {
        return new EmploymentAmendmentResponse(
                amendment.getId(), amendment.getStoreId(), amendment.getEmployeeId(), amendment.getEffectiveDate(),
                amendment.getEmploymentType(), amendment.getHourlyWage(), amendment.getMonthlySalary(),
                amendment.getContractedWeeklyHours(), amendment.getContractedWeeklyDays(), amendment.getStatus(),
                amendment.getElectronicSignatureEnvelopeId(), amendment.getDocumentVersion(),
                amendment.getVerifiedAt(), amendment.getAppliedAt());
    }
}
