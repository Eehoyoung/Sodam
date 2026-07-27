import { apiFetch } from "./api";
import type { WorkShift } from "./backend-types";

/** 매장 근무 시프트 목록 — GET /api/stores/{storeId}/shifts?from=YYYY-MM-DD&to=YYYY-MM-DD. */
export function fetchStoreShifts(storeId: number, from: string, to: string): Promise<WorkShift[]> {
  const params = new URLSearchParams({ from, to });
  return apiFetch<WorkShift[]>(`/api/stores/${storeId}/shifts?${params.toString()}`);
}

export interface ShiftCreateInput {
  employeeId: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  memo?: string;
}

export interface ShiftUpdateInput {
  shiftDate: string;
  startTime: string;
  endTime: string;
  memo?: string;
  /** 마지막으로 읽은 낙관적 락 버전 — 동시편집 충돌 감지(백엔드가 없으면 검증 생략, 있으면 필수 활용). */
  version?: number;
}

/** 근무 시프트 등록 — POST /api/stores/{storeId}/shifts. */
export function createShift(storeId: number, input: ShiftCreateInput): Promise<WorkShift> {
  return apiFetch<WorkShift>(`/api/stores/${storeId}/shifts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 근무 시프트 수정 — PUT /api/stores/{storeId}/shifts/{shiftId}. */
export function updateShift(storeId: number, shiftId: number, input: ShiftUpdateInput): Promise<WorkShift> {
  return apiFetch<WorkShift>(`/api/stores/${storeId}/shifts/${shiftId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** 근무 시프트 삭제 — DELETE /api/stores/{storeId}/shifts/{shiftId}. */
export function deleteShift(storeId: number, shiftId: number): Promise<void> {
  return apiFetch<void>(`/api/stores/${storeId}/shifts/${shiftId}`, { method: "DELETE" });
}
