package com.rich.sodam.dto.response;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.WagePaymentMethod;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 근로계약서 응답 DTO. 엔티티 전체 필드 + 서명 상태(signed/signedAt)를 노출한다.
 *
 * @param signed   직원 서명 완료 여부(employeeSignedAt != null)
 * @param signedAt 서명 시각(미서명이면 null)
 */
public record LaborContractResponse(
        Long id,
        Long employeeId,
        Long storeId,
        LocalDate startDate,
        LocalDate endDate,
        Integer hourlyWage,
        Integer wagePaymentDay,
        WagePaymentMethod wagePaymentMethod,
        String wageComponents,
        Double contractedHoursPerWeek,
        String weeklyHolidayDay,
        String annualLeaveNote,
        String workLocation,
        String jobDescription,
        boolean signed,
        LocalDateTime signedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static LaborContractResponse from(LaborContract c) {
        return new LaborContractResponse(
                c.getId(),
                c.getEmployeeId(),
                c.getStoreId(),
                c.getStartDate(),
                c.getEndDate(),
                c.getHourlyWage(),
                c.getWagePaymentDay(),
                c.getWagePaymentMethod(),
                c.getWageComponents(),
                c.getContractedHoursPerWeek(),
                c.getWeeklyHolidayDay(),
                c.getAnnualLeaveNote(),
                c.getWorkLocation(),
                c.getJobDescription(),
                c.isSigned(),
                c.getEmployeeSignedAt(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
