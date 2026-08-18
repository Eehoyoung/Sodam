import api from '../../../common/api/client';

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
  /** LLM 요약 문장(WP-2). provider 미설정/실패 시 null — 화면은 이 경우 기존 숫자 나열형으로 표시. */
  summary?: string | null;
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
  /** 미출근 직원 — employeeId 는 알림 발송이 요구하는 User id. 이름만으로는 발송할 수 없다. */
  pendingEmployees: {employeeId: number; name: string}[];
  /** 정정 요청 대기 건수 (매니저 홈 v3 46 ManagerHome 표시용, G-6) */
  pendingCorrectionCount: number;
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
