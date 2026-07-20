import api from '../../../common/api/client';

/**
 * 직원 본인 시급 이력 (E-NEW-02).
 * BE: GET /api/wage/my/history → MyWageHistoryDto.
 *
 * 직원 전용 읽기. 변경 주체(changedBy)·사장 메모(ownerMemo)는 BE 응답에 애초에 없다.
 */

export type WageScope = 'STORE_DEFAULT' | 'EMPLOYEE_OVERRIDE';

export interface MyWageHistoryEntry {
  /** 적용 시작일 (YYYY-MM-DD) */
  effectiveFrom: string;
  /** 변경된 시급(원) */
  hourlyWage: number;
  /** 매장 기본 / 개별 */
  scope: WageScope;
  /** 변경 사유 (없을 수 있음) */
  reason?: string | null;
}

export interface MyWageHistory {
  /** 현재 적용 시급(원). 소속 매장이 없으면 null. */
  currentHourlyWage: number | null;
  /** 변경 이력 (적용일 내림차순) */
  history: MyWageHistoryEntry[];
}

async function getMyWageHistory(): Promise<MyWageHistory> {
  const res = await api.get<MyWageHistory>('/api/wage/my/history');
  const raw = (res.data as {data?: MyWageHistory})?.data ?? res.data ?? {currentHourlyWage: null, history: []};
  return {
    currentHourlyWage: raw.currentHourlyWage ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
  };
}

export const myWageService = {getMyWageHistory};

export default myWageService;
