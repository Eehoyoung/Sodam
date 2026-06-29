import api from '../../../common/utils/api';

/**
 * 사장 승인 출퇴근 (위치/NFC 없이 사장 승인으로 출퇴근).
 * 직원: 요청·내 이력. 사장: 매장 대기목록·승인·거절.
 */

export type ApprovalType = 'CHECK_IN' | 'CHECK_OUT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceApproval {
  id: number;
  employeeId: number;
  employeeName: string;
  storeId: number;
  type: ApprovalType;
  requestedTime: string; // ISO LocalDateTime
  status: ApprovalStatus;
  resultAttendanceId?: number | null;
  rejectReason?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
}

/** 직원: 승인 출/퇴근 요청(요청 시각=서버시각). */
export async function requestApproval(storeId: number, type: ApprovalType): Promise<AttendanceApproval> {
  const {data} = await api.post<AttendanceApproval>('/api/attendance/approval-requests', {storeId, type});
  return data;
}

/** 직원: 내 요청 이력. */
export async function fetchMyApprovals(): Promise<AttendanceApproval[]> {
  const {data} = await api.get<AttendanceApproval[]>('/api/attendance/approval-requests/mine');
  return data;
}

/** 사장: 매장 요청 목록(기본 PENDING). */
export async function fetchStoreApprovals(
  storeId: number,
  status: ApprovalStatus = 'PENDING',
): Promise<AttendanceApproval[]> {
  const {data} = await api.get<AttendanceApproval[]>(`/api/stores/${storeId}/approval-requests`, {status});
  return data;
}

/** 사장: 승인(요청 시각으로 출퇴근 기록). */
export async function approveRequest(id: number): Promise<AttendanceApproval> {
  const {data} = await api.post<AttendanceApproval>(`/api/attendance/approval-requests/${id}/approve`, {});
  return data;
}

/** 사장: 거절. */
export async function rejectRequest(id: number, reason = ''): Promise<AttendanceApproval> {
  const {data} = await api.post<AttendanceApproval>(
    `/api/attendance/approval-requests/${id}/reject?reason=${encodeURIComponent(reason)}`,
    {},
  );
  return data;
}
