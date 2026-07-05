/**
 * S1 전자 근로계약서 — 타입.
 * BE: LaborContractResponse / LaborContractCreateRequest / LaborContractContextResponse 와 1:1.
 */

export type ContractPeriodType = 'PERMANENT' | 'FIXED_TERM';
export type WagePaymentMethod = 'BANK_TRANSFER' | 'CASH';

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
    signed: boolean;
    signedAt: string | null;
    hasSignatureImage: boolean;
    employeeSignatureImage: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

/** 사장 작성 요청 본문 (storeId 는 경로변수). */
export interface LaborContractCreatePayload extends Partial<WeeklySchedule> {
    employeeId: number;
    periodType?: ContractPeriodType;
    startDate?: string;
    endDate?: string;
    hourlyWage?: number;
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
}
