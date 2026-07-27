import { apiFetch } from "./api";

export type TimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | string;

export interface TimeOffRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  leaveType: string;
  unit: string;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  consumedDays: number;
  reason: string | null;
  rejectReason: string | null;
  status: TimeOffStatus;
}

/** 매장 휴가 신청 목록 — GET /api/timeoff/store/{storeId}. */
export function fetchStoreTimeOffs(storeId: number): Promise<TimeOffRequest[]> {
  return apiFetch<TimeOffRequest[]>(`/api/timeoff/store/${storeId}`);
}

/** 휴가 승인 — PUT /api/timeoff/{timeOffId}/approve. */
export function approveTimeOff(timeOffId: number): Promise<TimeOffRequest> {
  return apiFetch<TimeOffRequest>(`/api/timeoff/${timeOffId}/approve`, { method: "PUT" });
}

/** 휴가 거절 — PUT /api/timeoff/{timeOffId}/reject (사유 필수). */
export function rejectTimeOff(timeOffId: number, reason: string): Promise<TimeOffRequest> {
  return apiFetch<TimeOffRequest>(`/api/timeoff/${timeOffId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason }),
  });
}
