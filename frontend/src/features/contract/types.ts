/**
 * S1 전자 근로계약서 — 타입.
 * BE: LaborContractResponse / LaborContractCreateRequest 와 1:1.
 */

export interface LaborContract {
    id: number;
    employeeId: number;
    storeId: number;
    startDate: string | null;
    endDate: string | null;
    hourlyWage: number | null;
    wagePaymentDay: number | null;
    contractedHoursPerWeek: number | null;
    weeklyHolidayDay: string | null;
    annualLeaveNote: string | null;
    workLocation: string | null;
    jobDescription: string | null;
    signed: boolean;
    signedAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

/** 사장 작성 요청 본문 (storeId 는 경로변수). */
export interface LaborContractCreatePayload {
    employeeId: number;
    startDate?: string;
    endDate?: string;
    hourlyWage?: number;
    wagePaymentDay?: number;
    contractedHoursPerWeek?: number;
    weeklyHolidayDay?: string;
    annualLeaveNote?: string;
    workLocation?: string;
    jobDescription?: string;
}
