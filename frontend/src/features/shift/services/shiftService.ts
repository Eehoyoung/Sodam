import api from '../../../common/api/client';

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
  shiftDate: string; // YYYY-MM-DD (시작일 기준)
  startTime: string; // HH:MM[:SS]
  endTime: string; // HH:MM[:SS]
  memo?: string | null;
  crossesMidnight?: boolean; // BE 계산값: 종료<=시작이면 익일 종료(야간)
}

export interface WorkShiftCreateBody {
  employeeId: number;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  memo?: string;
}

export interface WorkShiftUpdateBody {
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

/** 시프트 수정(사장). 변경 시 BE에서 확정·알림 상태가 리셋된다(재확정 필요). */
export async function updateShift(
  storeId: number,
  shiftId: number,
  body: WorkShiftUpdateBody,
): Promise<WorkShift> {
  const {data} = await api.put<WorkShift>(`/api/stores/${storeId}/shifts/${shiftId}`, body);
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

// ─── 시프트 템플릿 (매장별 주간 패턴) ───────────────────────────────
export interface ShiftTemplateEntry {
  employeeId: number;
  dayOfWeek: string; // MONDAY..SUNDAY
  startTime: string; // HH:MM[:SS]
  endTime: string;
  memo?: string | null;
}

export interface ShiftTemplate {
  id: number;
  storeId: number;
  name: string;
  createdAt?: string;
  entryCount: number;
  entries: ShiftTemplateEntry[];
}

export interface ApplyTemplateResult {
  templateId: number;
  weekStart: string;
  createdCount: number;
  skippedCount: number;
  skipped: {employeeId: number; dayOfWeek: string; reason: string}[];
}

/** 매장 템플릿 목록(최신순). */
export async function fetchTemplates(storeId: number): Promise<ShiftTemplate[]> {
  const {data} = await api.get<ShiftTemplate[]>(`/api/stores/${storeId}/shift-templates`);
  return data;
}

/** 현재 기간(from~to) 근무를 템플릿으로 저장. */
export async function createTemplate(
  storeId: number,
  body: {name: string; from: string; to: string},
): Promise<ShiftTemplate> {
  const {data} = await api.post<ShiftTemplate>(`/api/stores/${storeId}/shift-templates`, body);
  return data;
}

/** 템플릿을 weekStart가 속한 주(월요일 기준)에 적용. */
export async function applyTemplate(
  storeId: number,
  templateId: number,
  weekStart: string,
): Promise<ApplyTemplateResult> {
  const {data} = await api.post<ApplyTemplateResult>(
    `/api/stores/${storeId}/shift-templates/${templateId}/apply?weekStart=${weekStart}`,
    {},
  );
  return data;
}

/** 템플릿 삭제. */
export async function deleteTemplate(storeId: number, templateId: number): Promise<void> {
  await api.delete(`/api/stores/${storeId}/shift-templates/${templateId}`);
}

/** 시:분만 표시(초 절단). "09:00:00" -> "09:00" */
export function shortTime(time: string): string {
  if (typeof time !== 'string') {
    return '';
  }
  return time.length >= 5 ? time.slice(0, 5) : time;
}

/** HH:MM[:SS] -> 자정 기준 분. 파싱 실패 시 0. */
function timeToMinutes(time: string): number {
  const [h, m] = shortTime(time).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return 0;
  }
  return h * 60 + m;
}

/** 종료시각이 시작시각보다 같거나 빠르면 익일 종료(야간 근무). BE crossesMidnight와 동일 규칙. */
export function isOvernight(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) <= timeToMinutes(startTime);
}

/**
 * 근무 시간(시) 계산. 야간이면 익일로 보고 +24h 랩어라운드.
 * 예 18:00~02:00 = 8h. 동일시각(0분)은 0h.
 */
export function shiftDurationHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const span = end > start ? end - start : end + 24 * 60 - start;
  return span / 60;
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

/** ISO 날짜에 n일 더한 ISO 날짜 반환. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toIso(date);
}

/** 'YYYY-MM-DD' 형식으로 오늘 날짜 반환. */
export function todayIso(): string {
  return toIso(new Date());
}

/** 현재 월 'YYYY-MM' 반환. */
export function currentYearMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

/** 'YYYY-MM' → {from: 첫날, to: 마지막날} ISO 날짜 범위 반환. */
export function monthRange(yearMonth: string): {from: string; to: string} {
  const [y, m] = yearMonth.split('-').map(Number);
  return {
    from: toIso(new Date(y, m - 1, 1)),
    to: toIso(new Date(y, m, 0)),
  };
}

/** ISO 날짜가 속한 주의 월요일(from) ~ 일요일(to) 반환. */
export function weekRangeOf(iso: string): {from: string; to: string} {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
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
