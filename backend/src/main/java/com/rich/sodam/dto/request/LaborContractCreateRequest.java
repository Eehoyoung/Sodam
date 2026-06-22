package com.rich.sodam.dto.request;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.WagePaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

/**
 * 근로계약서 작성 요청(사장). 근로기준법 §17 필수 기재사항을 포함한다.
 *
 * <p>service.save() 가 §17 누락을 한 번 더 검증하므로 여기서는 형식 검증만 한다.
 *
 * @param employeeId            대상 직원 id
 * @param hourlyWage            시급(원). 0 이상.
 * @param wagePaymentMethod     임금 지급방법(BANK_TRANSFER/CASH) — §17① 필수기재
 * @param wageComponents        임금 구성항목·계산방법 명시 — §17① 필수기재
 * @param contractedHoursPerWeek 주 소정근로시간
 * @param weeklyHolidayDay      주휴일 요일(예: SUNDAY)
 * @param workLocation          취업 장소
 * @param jobDescription        종사 업무
 */
public record LaborContractCreateRequest(
        @NotNull Long employeeId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @PositiveOrZero Integer hourlyWage,
        Integer wagePaymentDay,
        WagePaymentMethod wagePaymentMethod,
        String wageComponents,
        Double contractedHoursPerWeek,
        Integer contractedWeeklyDays,
        String weeklyHolidayDay,
        String annualLeaveNote,
        String workLocation,
        String jobDescription
) {
    /**
     * storeId 는 경로변수에서 주입(요청 본문 신뢰 금지).
     */
    public LaborContract toEntity(Long storeId) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(employeeId);
        c.setStoreId(storeId);
        c.setStartDate(startDate);
        c.setEndDate(endDate);
        c.setHourlyWage(hourlyWage);
        c.setWagePaymentDay(wagePaymentDay);
        c.setWagePaymentMethod(wagePaymentMethod);
        c.setWageComponents(wageComponents);
        c.setContractedHoursPerWeek(contractedHoursPerWeek);
        c.setContractedWeeklyDays(contractedWeeklyDays);
        c.setWeeklyHolidayDay(weeklyHolidayDay);
        c.setAnnualLeaveNote(annualLeaveNote);
        c.setWorkLocation(workLocation);
        c.setJobDescription(jobDescription);
        return c;
    }
}
