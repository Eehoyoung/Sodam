import api from '../../../common/api/client';

/**
 * 일일 매출 + 인건비율 — 사장이 하루 매출을 기록하면 정산주기/일별 인건비율을 보여준다.
 * BE: DailySalesController / LaborRatioController (계약 기반 — FE 선행 구현).
 */
export interface DailySale {
    saleDate: string; // YYYY-MM-DD
    amount: number;
}

export interface DailySalesUpsertBody {
    saleDate: string; // YYYY-MM-DD
    amount: number;
}

export interface DailyLaborRatio {
    date: string; // YYYY-MM-DD
    laborCost: number;
    sales: number | null;
    ratio: number | null;
}

export interface CycleLaborRatio {
    cycleStart: string;
    cycleEnd: string;
    laborCost: number;
    sales: number | null;
    ratio: number | null;
    prevCycleRatio: number | null;
}

/**
 * 인건비율 %를 결정한다.
 * BE ratio 의 단위(0~1 소수 vs 퍼센트)가 확정되지 않아 매출이 있으면 FE 에서 직접 계산하고,
 * 계산이 불가능할 때만 BE ratio 를 방어적으로 정규화(1 이하면 소수로 간주해 ×100)해 쓴다.
 * 반환: 퍼센트 값(예: 23.4) 또는 계산 불가 시 null.
 */
export function resolveRatioPercent(
    laborCost: number,
    sales: number | null | undefined,
    ratio: number | null | undefined,
): number | null {
    if (sales !== null && sales !== undefined && sales > 0) {
        return (laborCost / sales) * 100;
    }
    if (ratio === null || ratio === undefined) {
        return null;
    }
    return ratio <= 1 ? ratio * 100 : ratio;
}

/** 일일 매출 upsert — 같은 날짜로 다시 저장하면 수정된다. */
export async function upsertDailySales(storeId: number, body: DailySalesUpsertBody): Promise<DailySale> {
    const {data} = await api.post<DailySale>(`/api/stores/${storeId}/daily-sales`, body);
    return data;
}

export async function fetchRecentSales(storeId: number, days: number = 7): Promise<DailySale[]> {
    const {data} = await api.get<DailySale[]>(`/api/stores/${storeId}/daily-sales/recent`, {days});
    return data;
}

export async function fetchDailyLaborRatios(storeId: number, from: string, to: string): Promise<DailyLaborRatio[]> {
    const {data} = await api.get<DailyLaborRatio[]>(`/api/stores/${storeId}/labor-ratio/daily`, {from, to});
    return data;
}

export async function fetchCycleLaborRatio(storeId: number): Promise<CycleLaborRatio> {
    const {data} = await api.get<CycleLaborRatio>(`/api/stores/${storeId}/labor-ratio/cycle`);
    return data;
}
