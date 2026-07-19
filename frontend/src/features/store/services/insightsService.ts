import api from '../../../common/utils/api';

/** 사장용 주간 인사이트(A6). BE: GET /api/stores/{storeId}/insights/weekly */
export interface InsightItem {
  eventType: string;
  label: string;
  count: number;
}

export interface WeeklyInsights {
  storeId: number;
  fromDate: string;
  days: number;
  items: InsightItem[];
}

export async function fetchWeeklyInsights(storeId: number, days = 7): Promise<WeeklyInsights> {
  const {data} = await api.get<WeeklyInsights>(
    `/api/stores/${storeId}/insights/weekly`,
    {days},
  );
  return data;
}

/** 사장 대시보드 오늘 현황. BE: GET /api/store-queries/{storeId}/stats/today (StoreStatsController). */
export interface TodayStats {
  storeId: number;
  storeName: string;
  checkedInCount: number;
  totalActiveEmployees: number;
  pendingEmployees: string[];
}

export interface MonthPayrollStats {
  totalGross: number;
  totalNet: number;
  totalWorkingHours: number;
  daysRemainingInMonth: number;
}

export async function fetchTodayStats(storeId: number): Promise<TodayStats> {
  const {data} = await api.get<TodayStats>(`/api/store-queries/${storeId}/stats/today`);
  return data;
}

/** today+payroll 합성 조회(Phase 9 최적화) — 순차 2콜 대신 1콜. BE: GET /api/store-queries/{storeId}/stats/dashboard */
export async function fetchDashboardStats(storeId: number): Promise<{ today: TodayStats; payroll: MonthPayrollStats }> {
  const {data} = await api.get<{ today: TodayStats; payroll: MonthPayrollStats }>(
    `/api/store-queries/${storeId}/stats/dashboard`,
  );
  return data;
}
