/**
 * S1 전자 근로계약서 — 타입.
 * BE: LaborContractResponse / LaborContractCreateRequest / LaborContractContextResponse 와 1:1.
 */

export type ContractPeriodType = 'PERMANENT' | 'FIXED_TERM';
export type WagePaymentMethod = 'BANK_TRANSFER' | 'CASH';
export type LaborContractPayType = 'HOURLY' | 'SALARY';
export type SalaryPayUnit = 'MONTHLY' | 'ANNUAL';

export type WorkScheduleDayCode =
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'
    | 'SUNDAY';

/**
 * 요일별 근무 스케줄 1건 — BE WorkScheduleDay 와 1:1.
 * 시각은 'HH:mm'. 종료 ≤ 시작이면 익일(자정 넘김) 해석. 휴게는 쌍으로만(없으면 둘 다 null).
 */
export interface WorkScheduleDayDto {
    day: WorkScheduleDayCode;
    startTime: string;
    endTime: string;
    breakStartTime: string | null;
    breakEndTime: string | null;
}

export interface WeeklySchedule {
    monHours: number | null;
    tueHours: number | null;
    wedHours: number | null;
    thuHours: number | null;
    friHours: number | null;
    satHours: number | null;
    sunHours: number | null;
}

export interface LaborContract extends WeeklySchedule {
    id: number;
    employeeId: number;
    storeId: number;
    periodType: ContractPeriodType;
    startDate: string | null;
    endDate: string | null;
    hourlyWage: number | null;
    payType: LaborContractPayType;
    salaryPayUnit: SalaryPayUnit | null;
    monthlyBaseSalary: number | null;
    annualSalary: number | null;
    ordinaryHourlyWage: number | null;
    fixedOvertimeHoursPerMonth: number | null;
    fixedOvertimePay: number | null;
    fixedNightHoursPerMonth: number | null;
    fixedNightPay: number | null;
    fixedHolidayHoursWithin8PerMonth: number | null;
    fixedHolidayHoursOver8PerMonth: number | null;
    fixedHolidayPay: number | null;
    expectedMonthlyWage: number | null;
    fiveOrMoreEmployeesSnapshot: boolean | null;
    wagePaymentDay: number | null;
    wagePaymentMethod: WagePaymentMethod | null;
    wageComponents: string | null;
    contractedHoursPerWeek: number | null;
    workStartTime: string | null;
    workEndTime: string | null;
    breakMinutes: number | null;
    contractedWeeklyDays: number | null;
    weeklyHolidayDay: string | null;
    weeklyAllowanceApplicable: boolean;
    annualLeaveNote: string | null;
    workLocation: string | null;
    jobDescription: string | null;
    probation: boolean;
    probationMonths: number | null;
    probationWageRate: number | null;
    simpleLabor: boolean;
    employmentInsurance: boolean;
    industrialAccidentInsurance: boolean;
    nationalPension: boolean;
    healthInsurance: boolean;
    minimumWageCompliant: boolean;
    minimumWageReferenceYear: number;
    minimumWageReferenceValue: number;
    /** 사장이 실제로 발송했는지(sentAt != null). false면 아직 작성(임시저장) 단계 — 직원에겐 안 보임. */
    sent: boolean;
    sentAt: string | null;
    signed: boolean;
    signedAt: string | null;
    hasSignatureImage: boolean;
    employeeSignatureImage: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    /** 요일별 근무 스케줄(스케줄 자동 산출 모드에서 존재). 구계약 응답 호환을 위해 optional. */
    workSchedule?: WorkScheduleDayDto[] | null;
    /** 스케줄 자동 산출 기준시급(원) — 스케줄 모드에서만 값 존재. */
    salaryBaseHourlyWage?: number | null;
    /** 월급·연봉이 스케줄에서 자동 산출되었는지(SALARY + 스케줄 존재). */
    scheduleDerivedSalary?: boolean;
}

/** 사장 작성 요청 본문 (storeId 는 경로변수). */
export interface LaborContractCreatePayload extends Partial<WeeklySchedule> {
    employeeId: number;
    periodType?: ContractPeriodType;
    startDate?: string;
    endDate?: string;
    hourlyWage?: number;
    payType?: LaborContractPayType;
    salaryPayUnit?: SalaryPayUnit;
    monthlyBaseSalary?: number;
    annualSalary?: number;
    ordinaryHourlyWage?: number;
    fixedOvertimeHoursPerMonth?: number;
    fixedOvertimePay?: number;
    fixedNightHoursPerMonth?: number;
    fixedNightPay?: number;
    fixedHolidayHoursWithin8PerMonth?: number;
    fixedHolidayHoursOver8PerMonth?: number;
    fixedHolidayPay?: number;
    expectedMonthlyWage?: number;
    fiveOrMoreEmployeesSnapshot?: boolean;
    wagePaymentDay?: number;
    wagePaymentMethod?: WagePaymentMethod;
    wageComponents?: string;
    contractedHoursPerWeek?: number;
    workStartTime?: string;
    workEndTime?: string;
    breakMinutes?: number;
    contractedWeeklyDays?: number;
    weeklyHolidayDay?: string;
    annualLeaveNote?: string;
    workLocation?: string;
    jobDescription?: string;
    probation?: boolean;
    probationMonths?: number;
    probationWageRate?: number;
    simpleLabor?: boolean;
    employmentInsurance?: boolean;
    industrialAccidentInsurance?: boolean;
    nationalPension?: boolean;
    healthInsurance?: boolean;
    /**
     * 요일별 근무 스케줄. payType=SALARY 에서 존재하면 스케줄 자동 산출 모드 —
     * 서버가 salaryBaseHourlyWage 와 함께 월급·연봉·고정수당을 산출하고(서버 권위),
     * 함께 보낸 monthlyBaseSalary/annualSalary/fixed* 직접 입력값은 무시한다.
     */
    workSchedule?: WorkScheduleDayDto[];
    /** 급여 기준시급(원) — 스케줄 자동 산출 모드 필수(기본값 = 매장 기준시급). */
    salaryBaseHourlyWage?: number;
}

/** 근로계약서 작성 화면 보조정보(당사자 정보·법정 기준값). */
export interface LaborContractContext {
    employerName: string | null;
    employerBusinessNumber: string | null;
    employerPhone: string | null;
    employerAddress: string | null;
    employeeName: string | null;
    employeePhone: string | null;
    employeeBirthDate: string | null;
    minorWorker: boolean;
    minimumWageYear: number;
    minimumWageHourly: number;
    nightWorkRate: number;
    overtimeRate: number;
    weeklyAllowanceThreshold: number;
    fiveOrMoreEmployees: boolean;
    employeeCount: number | null;
    suggestedWageComponents: string;
    /** 국민연금 기준소득월액 하한(원, 오늘 날짜 기준) — 매년 7.1 갱신되므로 하드코딩 금지. */
    nationalPensionMinMonthlyIncome: number;
}
