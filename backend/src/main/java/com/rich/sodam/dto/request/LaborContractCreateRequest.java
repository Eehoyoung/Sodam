package com.rich.sodam.dto.request;

import com.rich.sodam.domain.LaborContract;
import com.rich.sodam.domain.type.ContractPeriodType;
import com.rich.sodam.domain.type.LaborContractPayType;
import com.rich.sodam.domain.type.SalaryPayUnit;
import com.rich.sodam.domain.type.WagePaymentMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * 근로계약서 작성 요청(사장). 근로기준법 §17 필수 기재사항 + 근로형태별 추가 사항을 포함한다.
 *
 * <p>service.save() 가 §17 누락(임금·소정근로시간·휴일·연차·취업장소·업무·지급방법·구성항목)을
 * 한 번 더 검증한다. 주 15시간 미만 근로자는 §18③ 에 따라 휴일·연차가 적용되지 않아
 * 주휴일과 연차 안내를 강제로 비운다.
 *
 * @param employeeId              대상 직원 id
 * @param periodType              계약기간 구분(정함없음/기간제). null 이면 PERMANENT.
 * @param hourlyWage              시급(원). 0 이상.
 * @param wagePaymentMethod       임금 지급방법(BANK_TRANSFER/CASH) — §17① 필수기재
 * @param wageComponents          임금 구성항목·계산방법 명시 — §17① 필수기재
 * @param contractedHoursPerWeek  주 소정근로시간
 * @param workStartTime           시업 시각
 * @param workEndTime             종업 시각
 * @param breakMinutes            휴게시간(분)
 * @param weeklyHolidayDay        주휴일 요일(예: SUNDAY). 주 15시간 미만이면 무시되고 null 저장.
 * @param workLocation            취업 장소
 * @param jobDescription          종사 업무
 * @param probation               수습 적용 여부
 * @param probationMonths         수습기간(개월)
 * @param probationWageRate       수습 중 임금 비율(예: 0.90)
 * @param simpleLabor             단순노무업무 해당 여부. true 이면 수습 최저임금 감액 불가.
 * @param employmentInsurance     고용보험 적용 여부
 * @param industrialAccidentInsurance 산재보험 적용 여부
 * @param nationalPension         국민연금 적용 여부
 * @param healthInsurance         건강보험 적용 여부
 */
public record LaborContractCreateRequest(
        @NotNull Long employeeId,
        ContractPeriodType periodType,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @PositiveOrZero Integer hourlyWage,
        LaborContractPayType payType,
        SalaryPayUnit salaryPayUnit,
        @PositiveOrZero Integer monthlyBaseSalary,
        @PositiveOrZero Integer annualSalary,
        @PositiveOrZero Integer ordinaryHourlyWage,
        @PositiveOrZero Double fixedOvertimeHoursPerMonth,
        @PositiveOrZero Integer fixedOvertimePay,
        @PositiveOrZero Double fixedNightHoursPerMonth,
        @PositiveOrZero Integer fixedNightPay,
        @PositiveOrZero Double fixedHolidayHoursWithin8PerMonth,
        @PositiveOrZero Double fixedHolidayHoursOver8PerMonth,
        @PositiveOrZero Integer fixedHolidayPay,
        @PositiveOrZero Integer expectedMonthlyWage,
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
        String annualLeaveNote,
        String workLocation,
        String jobDescription,
        Boolean probation,
        Integer probationMonths,
        Double probationWageRate,
        Boolean simpleLabor,
        Boolean employmentInsurance,
        Boolean industrialAccidentInsurance,
        Boolean nationalPension,
        Boolean healthInsurance
) {
    /**
     * storeId 는 경로변수에서 주입(요청 본문 신뢰 금지).
     */
    public LaborContract toEntity(Long storeId) {
        LaborContract c = new LaborContract();
        c.setEmployeeId(employeeId);
        c.setStoreId(storeId);
        c.setPeriodType(periodType != null ? periodType : ContractPeriodType.PERMANENT);
        c.setStartDate(startDate);
        c.setEndDate(endDate);
        c.setHourlyWage(hourlyWage);
        c.setPayType(payType != null ? payType : LaborContractPayType.HOURLY);
        c.setSalaryPayUnit(salaryPayUnit);
        c.setMonthlyBaseSalary(monthlyBaseSalary);
        c.setAnnualSalary(annualSalary);
        c.setOrdinaryHourlyWage(ordinaryHourlyWage);
        c.setFixedOvertimeHoursPerMonth(fixedOvertimeHoursPerMonth);
        c.setFixedOvertimePay(fixedOvertimePay);
        c.setFixedNightHoursPerMonth(fixedNightHoursPerMonth);
        c.setFixedNightPay(fixedNightPay);
        c.setFixedHolidayHoursWithin8PerMonth(fixedHolidayHoursWithin8PerMonth);
        c.setFixedHolidayHoursOver8PerMonth(fixedHolidayHoursOver8PerMonth);
        c.setFixedHolidayPay(fixedHolidayPay);
        c.setExpectedMonthlyWage(expectedMonthlyWage);
        c.setFiveOrMoreEmployeesSnapshot(fiveOrMoreEmployeesSnapshot);
        c.setWagePaymentDay(wagePaymentDay);
        c.setWagePaymentMethod(wagePaymentMethod);
        c.setWageComponents(wageComponents);
        c.setContractedHoursPerWeek(contractedHoursPerWeek);
        c.setWorkStartTime(workStartTime);
        c.setWorkEndTime(workEndTime);
        c.setBreakMinutes(breakMinutes);
        c.setContractedWeeklyDays(contractedWeeklyDays);
        c.setMonHours(monHours);
        c.setTueHours(tueHours);
        c.setWedHours(wedHours);
        c.setThuHours(thuHours);
        c.setFriHours(friHours);
        c.setSatHours(satHours);
        c.setSunHours(sunHours);
        c.setWeeklyHolidayDay(weeklyHolidayDay);
        c.setAnnualLeaveNote(annualLeaveNote);
        c.setWorkLocation(workLocation);
        c.setJobDescription(jobDescription);
        c.setProbation(probation != null && probation);
        c.setProbationMonths(probationMonths);
        c.setProbationWageRate(probationWageRate);
        c.setSimpleLabor(simpleLabor == null || simpleLabor);
        c.setEmploymentInsurance(employmentInsurance == null || employmentInsurance);
        c.setIndustrialAccidentInsurance(industrialAccidentInsurance == null || industrialAccidentInsurance);
        c.setNationalPension(nationalPension == null || nationalPension);
        c.setHealthInsurance(healthInsurance == null || healthInsurance);
        return c;
    }
}
