import api from '../../../common/utils/api';

/**
 * 근무 시프트(B10/E-NEW-05).
 * 사장: /api/stores/{storeId}/shifts (등록·기간조회·삭제)
 * 직원: /api/shifts/my (본인 기간조회)
 * 스코프: 등록·조회만 — 채용·구인·자동배정 없음(Non-Goal).
 */
export interface WorkShift {
  id: number;
  employeeId: number;
  storeId: number;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM[:SS]
  endTime: string; // HH:MM[:SS]
  memo?: string | null;
}

export interface WorkShiftCreateBody {
  employeeId: number;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  memo?: string;
}

export interface StoreShiftConfirmBody {
  from: string;
  to: string;
}

export interface StoreShiftConfirmResult {
  storeId: number;
  from: string;
  to: string;
  confirmedCount: number;
  notifiedCount: number;
}

/** 직원 본인 시프트(기간). */
export async function fetchMyShifts(from: string, to: string): Promise<WorkShift[]> {
  const {data} = await api.get<WorkShift[]>('/api/shifts/my', {from, to});
  return data;
}

/** 매장 시프트 목록(사장, 기간). */
export async function fetchStoreShifts(storeId: number, from: string, to: string): Promise<WorkShift[]> {
  const {data} = await api.get<WorkShift[]>(`/api/stores/${storeId}/shifts`, {from, to});
  return data;
}

/** 시프트 등록(사장). */
export async function createShift(storeId: number, body: WorkShiftCreateBody): Promise<WorkShift> {
  const {data} = await api.post<WorkShift>(`/api/stores/${storeId}/shifts`, body);
  return data;
}

/** 시프트 삭제(사장). */
export async function deleteShift(storeId: number, shiftId: number): Promise<void> {
  await api.delete(`/api/stores/${storeId}/shifts/${shiftId}`);
}

export async function confirmStoreWeekShifts(
  storeId: number,
  body: StoreShiftConfirmBody,
): Promise<StoreShiftConfirmResult> {
  const {data} = await api.post<StoreShiftConfirmResult>(
    `/api/stores/${storeId}/shifts/notify`,
    body,
  );
  const wrapped: any = data as any;
  if (typeof wrapped?.confirmedCount === 'number') {
    return wrapped as StoreShiftConfirmResult;
  }
  if (typeof wrapped?.data?.confirmedCount === 'number') {
    return wrapped.data as StoreShiftConfirmResult;
  }
  return {
    storeId,
    from: body.from,
    to: body.to,
    confirmedCount: 0,
    notifiedCount: 0,
  };
}

/** 시:분만 표시(초 절단). "09:00:00" -> "09:00" */
export function shortTime(time: string): string {
  if (typeof time !== 'string') {
    return '';
  }
  return time.length >= 5 ? time.slice(0, 5) : time;
}

/** 이번 주(월~일) 범위를 YYYY-MM-DD 문자열로 반환. */
export function thisWeekRange(today: Date = new Date()): {from: string; to: string} {
  const day = today.getDay(); // 0(일)~6(토)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {from: toIso(monday), to: toIso(sunday)};
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
