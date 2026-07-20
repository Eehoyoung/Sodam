import api from '../../../common/api/client';

/**
 * 즉시 보너스(비정기 포상금) — "오늘 바빠서 1만원 더" 같은 사장의 즉흥 지급 결정.
 * BE: PayrollBonusController. 급여합산형(INCLUDED_IN_PAYROLL)은 다음 급여 정산 시 자동 합산된다.
 */
export type BonusPaymentTiming = 'IMMEDIATE_CASH' | 'INCLUDED_IN_PAYROLL';

export interface PayrollBonus {
    id: number;
    employeeId: number;
    storeId: number;
    bonusDate: string;
    amount: number;
    reason: string | null;
    paymentTiming: BonusPaymentTiming;
    consumed: boolean;
    includedInPayrollId: number | null;
    createdAt: string;
}

export interface PayrollBonusCreateBody {
    employeeId: number;
    bonusDate: string;
    amount: number;
    reason?: string;
    paymentTiming: BonusPaymentTiming;
}

export async function createBonus(storeId: number, body: PayrollBonusCreateBody): Promise<PayrollBonus> {
    const {data} = await api.post<PayrollBonus>(`/api/stores/${storeId}/bonuses`, body);
    return data;
}

export async function fetchBonusesForEmployee(storeId: number, employeeId: number): Promise<PayrollBonus[]> {
    const {data} = await api.get<PayrollBonus[]>(`/api/stores/${storeId}/employees/${employeeId}/bonuses`);
    return data;
}

export async function fetchMyBonuses(): Promise<PayrollBonus[]> {
    const {data} = await api.get<PayrollBonus[]>('/api/bonuses/my');
    return data;
}
