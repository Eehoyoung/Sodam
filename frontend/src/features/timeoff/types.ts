/**
 * TimeOff(휴가) 공용 타입 — 직원 신청(myLeaveService)·사장 승인(myPage/timeOffService)이 공유.
 * BE: TimeOffResponse(record) 계약과 1:1 대응.
 */

export type TimeOffLeaveType = 'ANNUAL' | 'UNPAID' | 'OTHER';
export type TimeOffUnit = 'FULL_DAY' | 'HALF_DAY' | 'HOURS';
export type TimeOffStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const TIME_OFF_LEAVE_TYPE_LABEL: Record<TimeOffLeaveType, string> = {
  ANNUAL: '연차',
  UNPAID: '무급',
  OTHER: '기타',
};

export const TIME_OFF_UNIT_LABEL: Record<TimeOffUnit, string> = {
  FULL_DAY: '종일',
  HALF_DAY: '반차',
  HOURS: '시간단위',
};

/**
 * 연차 일수 표시 포맷 — 반차(0.5)·시간단위 환산 등 소수 값은 "2.5" 처럼 보여주고,
 * 정수 값은 소수점 없이 보여준다. MyLeaveBalanceScreen·TimeOffApprovalScreen 공용.
 */
export function formatConsumedDays(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

/** BE: POST /api/timeoff/self 요청 바디(TimeOffSelfRequest). */
export interface TimeOffCreatePayload {
  storeId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  /** 생략 시 서버가 ANNUAL 로 처리 */
  leaveType?: TimeOffLeaveType;
  /** 생략 시 서버가 FULL_DAY 로 처리 */
  unit?: TimeOffUnit;
  /** unit=HOURS 일 때만. HH:mm:ss */
  startTime?: string;
  /** unit=HOURS 일 때만. HH:mm:ss */
  endTime?: string;
}

/** BE: TimeOffResponse(record) — 신청 응답 및 목록 조회 공통 형태. */
export interface TimeOffResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  leaveType: TimeOffLeaveType;
  unit: TimeOffUnit;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  consumedDays: number;
  reason: string;
  rejectReason: string | null;
  status: TimeOffStatus;
}
