import {api} from '../../../common/utils/api';

export interface SalaryPredictionRequest {
    employeeId: number;
    storeId: number;
}

export interface DeductionItem {
    name: string;
    amount: number;
    description?: string;
}

export interface SalaryPredictionResponse {
    predictedAmount: number;
    workingHours: number;
    hourlyRate: number;
    deductions: DeductionItem[];
    netAmount: number;
    predictionDate: string;
    endOfMonth: string;
    remainingWorkingDays: number;
    remainingWorkingHours: number;
}

/**
 * 급여 예측 API
 * 현재까지의 근무 기록을 기반으로 이번 달 예상 급여 계산
 * @param employeeId 직원 ID
 * @param storeId 매장 ID
 * @returns 예상 급여 정보
 */
export const getSalaryPrediction = async (
    employeeId: number,
    storeId: number
): Promise<SalaryPredictionResponse> => {
    try {
        const response = await api.get<SalaryPredictionResponse>(
            '/api/salary/prediction',
            {
                params: {
                    employeeId,
                    storeId
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('급여 예측 조회 실패:', error);
        throw new Error('급여 예측 정보를 가져오는데 실패했습니다.');
    }
};

/**
 * 세금 계산 함수
 * 간단한 세금 계산 로직 (실제 세금 계산은 더 복잡할 수 있음)
 * @param amount 총 급여 금액
 * @returns 세금 및 공제 항목 목록
 */
export const calculateDeductions = (amount: number): DeductionItem[] => {
    // 간단한 세금 계산 예시 (실제 세금 계산은 더 복잡함)
    const incomeTax = Math.round(amount * 0.033); // 소득세 3.3%
    const nationalPension = Math.round(amount * 0.045); // 국민연금 4.5%
    const healthInsurance = Math.round(amount * 0.0343); // 건강보험 3.43%
    const employmentInsurance = Math.round(amount * 0.008); // 고용보험 0.8%

    return [
        {
            name: '소득세',
            amount: incomeTax,
            description: '근로소득세 3.3%'
        },
        {
            name: '국민연금',
            amount: nationalPension,
            description: '국민연금 4.5%'
        },
        {
            name: '건강보험',
            amount: healthInsurance,
            description: '건강보험 3.43%'
        },
        {
            name: '고용보험',
            amount: employmentInsurance,
            description: '고용보험 0.8%'
        }
    ];
};

/**
 * 순 급여 계산 함수
 * 총 급여에서 세금 및 공제 항목을 제외한 금액 계산
 * @param grossAmount 총 급여 금액
 * @param deductions 세금 및 공제 항목 목록
 * @returns 순 급여 금액
 */
export const calculateNetSalary = (
    grossAmount: number,
    deductions: DeductionItem[]
): number => {
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
    return grossAmount - totalDeductions;
};

/**
 * 남은 근무 일수 계산 함수
 * @param endOfMonth 월말 날짜 (YYYY-MM-DD 형식)
 * @returns 오늘부터 월말까지 남은 근무 일수 (주말 제외)
 */
export const calculateRemainingWorkingDays = (endOfMonth: string): number => {
    const today = new Date();
    const endDate = new Date(endOfMonth);

    // 오늘 날짜가 월말 이후인 경우
    if (today > endDate) {
        return 0;
    }

    let workingDays = 0;
    const currentDate = new Date(today);

    // 날짜를 하루씩 증가시키며 주말이 아닌 날만 카운트
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // 0: 일요일, 6: 토요일
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return workingDays;
};

/**
 * 오프라인 급여 예측 계산 함수
 * 백엔드 API 호출이 실패한 경우 클라이언트에서 간단한 예측 수행
 * @param workingHours 현재까지 근무 시간
 * @param hourlyRate 시급
 * @param remainingDays 남은 근무 일수
 * @param avgHoursPerDay 일평균 근무 시간
 * @returns 예상 급여 정보
 */
export const calculateOfflinePrediction = (
    workingHours: number,
    hourlyRate: number,
    remainingDays: number,
    avgHoursPerDay: number
): SalaryPredictionResponse => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // 이번 달의 마지막 날
    const lastDay = new Date(year, month + 1, 0);
    const endOfMonth = lastDay.toISOString().split('T')[0];

    // 남은 예상 근무 시간
    const remainingHours = remainingDays * avgHoursPerDay;

    // 총 예상 근무 시간
    const totalHours = workingHours + remainingHours;

    // 총 예상 급여
    const predictedAmount = Math.round(totalHours * hourlyRate);

    // 세금 및 공제 항목 계산
    const deductions = calculateDeductions(predictedAmount);

    // 순 급여 계산
    const netAmount = calculateNetSalary(predictedAmount, deductions);

    return {
        predictedAmount,
        workingHours: totalHours,
        hourlyRate,
        deductions,
        netAmount,
        predictionDate: today.toISOString().split('T')[0],
        endOfMonth,
        remainingWorkingDays: remainingDays,
        remainingWorkingHours: remainingHours
    };
};
