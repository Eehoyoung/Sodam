import { apiFetch } from "./api";
import type { AttendanceApprovalRequestItem, AttendanceRecord } from "./backend-types";

/**
 * 매장 출퇴근 기록 조회 — GET /api/attendance/store/{storeId}.
 * startDate/endDate 는 ISO LocalDateTime(yyyy-MM-dd'T'HH:mm:ss) 문자열이어야 한다(백엔드 필수 파라미터).
 */
export function fetchStoreAttendance(
  storeId: number,
  startDate: string,
  endDate: string,
): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams({ startDate, endDate });
  return apiFetch<AttendanceRecord[]>(`/api/attendance/store/${storeId}?${params.toString()}`);
}

/** 사장승인 출퇴근 요청 목록 — GET /api/stores/{storeId}/approval-requests. */
export function fetchApprovalRequests(storeId: number): Promise<AttendanceApprovalRequestItem[]> {
  return apiFetch<AttendanceApprovalRequestItem[]>(`/api/stores/${storeId}/approval-requests`);
}

/** 출퇴근 승인 — POST /api/attendance/approval-requests/{id}/approve. */
export function approveAttendanceRequest(id: number): Promise<AttendanceApprovalRequestItem> {
  return apiFetch<AttendanceApprovalRequestItem>(`/api/attendance/approval-requests/${id}/approve`, {
    method: "POST",
  });
}

/** 출퇴근 거절 — POST /api/attendance/approval-requests/{id}/reject?reason=. */
export function rejectAttendanceRequest(id: number, reason: string): Promise<AttendanceApprovalRequestItem> {
  const params = new URLSearchParams({ reason });
  return apiFetch<AttendanceApprovalRequestItem>(
    `/api/attendance/approval-requests/${id}/reject?${params.toString()}`,
    { method: "POST" },
  );
}
