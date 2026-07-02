/**
 * 급여 관리 관련 타입 정의
 */

/**
 * 급여 기록 인터페이스
 */
export interface SalaryRecord {
    id: string;
    employeeId: string;
    employeeName: string;
    workplaceId: string;
    workplaceName: string;
    period: string;
    startDate: string;
    endDate: string;
    baseAmount: number;
    overtimeAmount: number;
    bonusAmount: number;
    deductionAmount: number;
    totalAmount: number;
    status: SalaryStatus;
    paymentDate?: string;
    note?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * 급여 상태 열거형
 */
export enum SalaryStatus {
    PENDING = 'PENDING',   // 지급 대기
    PAID = 'PAID',         // 지급 완료
    CANCELLED = 'CANCELLED' // 취소됨
}

/**
 * 급여 생성 요청 인터페이스
 */
export interface CreateSalaryRequest {
    employeeId: string;
    workplaceId: string;
    period: string;
    startDate: string;
    endDate: string;
    baseAmount: number;
    overtimeAmount?: number;
    bonusAmount?: number;
    deductionAmount?: number;
    note?: string;
}

/**
 * 급여 수정 요청 인터페이스
 */
export interface UpdateSalaryRequest {
    baseAmount?: number;
    overtimeAmount?: number;
    bonusAmount?: number;
    deductionAmount?: number;
    status?: SalaryStatus;
    paymentDate?: string;
    note?: string;
}

/**
 * 급여 필터 인터페이스
 */
export interface SalaryFilter {
    workplaceId?: string;
    employeeId?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
    status?: SalaryStatus;
}

/**
 * 급여 통계 인터페이스
 */
export interface SalaryStatistics {
    totalPaid: number;
    totalPending: number;
    averageSalary: number;
    highestSalary: number;
    lowestSalary: number;
    monthlySummary: {
        period: string;
        totalAmount: number;
        employeeCount: number;
    }[];
}

/**
 * 급여 정책 인터페이스
 */
export interface SalaryPolicy {
    id: string;
    workplaceId: string;
    baseHourlyRate: number;
    overtimeRate: number;
    nightShiftRate: number;
    holidayRate: number;
    taxRate: number;
    insuranceRate: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * 급여 예측 요청 인터페이스
 */
export interface SalaryPredictionRequest {
    employeeId: string;
    workplaceId: string;
    currentDate?: string; // 현재 날짜 (기본값: 오늘)
}

/**
 * 급여 예측 응답 인터페이스
 */
export interface SalaryPrediction {
    employeeId: string;
    employeeName: string;
    workplaceId: string;
    workplaceName: string;
    currentDate: string;
    periodStartDate: string;
    periodEndDate: string;
    workedDays: number;
    workedHours: number;
    estimatedBaseAmount: number;
    estimatedOvertimeAmount: number;
    estimatedTotalAmount: number;
    estimatedDeductions: number;
    estimatedNetAmount: number;
    remainingWorkDays: number;
    remainingWorkHours: number;
    projectedTotalAmount: number;
    averageHoursPerDay: number;
    averageAmountPerDay: number;
}
