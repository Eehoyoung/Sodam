package com.rich.sodam.dto.response;

import com.rich.sodam.core.payroll.constant.MinimumWage;
import com.rich.sodam.core.payroll.weeklyallowance.LaborLawConstants;
import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.domain.type.SalaryPayUnit;
import com.rich.sodam.domain.type.WagePaymentMethod;
import com.rich.sodam.service.LaborContractService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 근로계약서 응답 DTO. 엔티티 전체 필드 + 서명 상태 + 파생 판정값(휴일·연차 적용 여부·최저임금 준수 여부)을 노출한다.
 *
 * @param weeklyAllowanceApplicable 주 소정근로시간이 15시간 이상이라 §55 휴일과 §60 연차가 적용되는지
 * @param minimumWageCompliant      시급이 계약연도(또는 올해) 최저임금 이상인지(합법 수습 감액은 반영)
 * @param minimumWageReferenceYear  준수 여부 판정에 사용한 연도
 * @param minimumWageReferenceValue 판정에 사용한 해당 연도 시간급 최저임금(원)
 * @param signed                    직원 서명 완료 여부(employeeSignedAt != null)
 * @param signedAt                  서명 시각(미서명이면 null)
 * @param hasSignatureImage         서명 이미지 첨부 여부(응답 경량화 — 목록에서는 실제 이미지 생략 가능)
 */
public record LaborContractResponse(
        Long id,
        Long employeeId,
        Long storeId,
        ContractPeriodType periodType,
        LocalDate startDate,
        LocalDate endDate,
        Integer hourlyWage,
        LaborContractPayType payType,
        SalaryPayUnit salaryPayUnit,
        Integer monthlyBaseSalary,
        Integer annualSalary,
        Integer ordinaryHourlyWage,
        Double fixedOvertimeHoursPerMonth,
        Integer fixedOvertimePay,
        Double fixedNightHoursPerMonth,
        Integer fixedNightPay,
        Double fixedHolidayHoursWithin8PerMonth,
        Double fixedHolidayHoursOver8PerMonth,
        Integer fixedHolidayPay,
        Integer expectedMonthlyWage,
        Boolean fiveOrMoreEmployeesSnapshot,
        Integer wagePaymentDay,
        WagePaymentMethod wagePaymentMethod,
        String wageComponents,
        Double contractedHoursPerWeek,
        LocalTime workStartTime,
        LocalTime workEndTime,
        Integer breakMinutes,
        Integer contractedWeeklyDays,
        Double monHours,
        Double tueHours,
        Double wedHours,
        Double thuHours,
        Double friHours,
        Double satHours,
        Double sunHours,
        String weeklyHolidayDay,
        boolean weeklyAllowanceApplicable,
        String annualLeaveNote,
        String workLocation,
        String jobDescription,
        boolean probation,
        Integer probationMonths,
        Double probationWageRate,
        boolean simpleLabor,
        boolean employmentInsurance,
        boolean industrialAccidentInsurance,
        boolean nationalPension,
        boolean healthInsurance,
        boolean minimumWageCompliant,
        int minimumWageReferenceYear,
        int minimumWageReferenceValue,
        boolean signed,
        LocalDateTime signedAt,
        boolean hasSignatureImage,
        String employeeSignatureImage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static LaborContractResponse from(LaborContract c) {
        int refYear = c.getStartDate() != null ? c.getStartDate().getYear() : LocalDate.now().getYear();
        int refValue = MinimumWage.hourlyFor(refYear).intValue();
        double wageThresholdRate = LaborContractService.isProbationWageReductionAllowed(c)
                ? c.getProbationWageRate()
                : 1.0;
        int requiredHourlyWage = (int) Math.ceil(refValue * wageThresholdRate);
        boolean minWageOk = c.getHourlyWage() == null
                || c.getHourlyWage() >= requiredHourlyWage;
        boolean weeklyAllowanceApplicable = c.getContractedHoursPerWeek() != null
                && c.getContractedHoursPerWeek() >= LaborLawConstants.MIN_WEEKLY_HOURS_FOR_ALLOWANCE.doubleValue();

        return new LaborContractResponse(
                c.getId(),
                c.getEmployeeId(),
                c.getStoreId(),
                c.getPeriodType(),
                c.getStartDate(),
                c.getEndDate(),
                c.getHourlyWage(),
                c.getPayType(),
                c.getSalaryPayUnit(),
                c.getMonthlyBaseSalary(),
                c.getAnnualSalary(),
                c.getOrdinaryHourlyWage(),
                c.getFixedOvertimeHoursPerMonth(),
                c.getFixedOvertimePay(),
                c.getFixedNightHoursPerMonth(),
                c.getFixedNightPay(),
                c.getFixedHolidayHoursWithin8PerMonth(),
                c.getFixedHolidayHoursOver8PerMonth(),
                c.getFixedHolidayPay(),
                c.getExpectedMonthlyWage(),
                c.getFiveOrMoreEmployeesSnapshot(),
                c.getWagePaymentDay(),
                c.getWagePaymentMethod(),
                c.getWageComponents(),
                c.getContractedHoursPerWeek(),
                c.getWorkStartTime(),
                c.getWorkEndTime(),
                c.getBreakMinutes(),
                c.getContractedWeeklyDays(),
                c.getMonHours(),
                c.getTueHours(),
                c.getWedHours(),
                c.getThuHours(),
                c.getFriHours(),
                c.getSatHours(),
                c.getSunHours(),
                c.getWeeklyHolidayDay(),
                weeklyAllowanceApplicable,
                c.getAnnualLeaveNote(),
                c.getWorkLocation(),
                c.getJobDescription(),
                c.isProbation(),
                c.getProbationMonths(),
                c.getProbationWageRate(),
                c.isSimpleLabor(),
                c.isEmploymentInsurance(),
                c.isIndustrialAccidentInsurance(),
                c.isNationalPension(),
                c.isHealthInsurance(),
                minWageOk,
                refYear,
                refValue,
                c.isSigned(),
                c.getEmployeeSignedAt(),
                c.getEmployeeSignatureImage() != null,
                c.getEmployeeSignatureImage(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
