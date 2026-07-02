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
