import { apiFetch } from "./api";

export interface DayOperatingHours {
  dayOfWeek: string;
  dayOfWeekKorean: string;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  operatingTimeString: string;
}

export interface OperatingHours {
  storeId: number;
  storeName: string;
  isCurrentlyOpen: boolean;
  operatingHours: DayOperatingHours[];
}

/** 매장 운영시간 조회 — GET /api/stores/{storeId}/operating-hours. */
export function fetchOperatingHours(storeId: number): Promise<OperatingHours> {
  return apiFetch<OperatingHours>(`/api/stores/${storeId}/operating-hours`);
}
