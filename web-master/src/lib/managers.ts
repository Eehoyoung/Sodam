import { apiFetch } from "./api";

/**
 * ⛔ CONTRACT_MANAGE(근로계약 대리)·PAYROLL_CONFIRM(급여 확정)은 노무사 검토 미완료 상태(CLAUDE.md) —
 * 부여 UI에 노출은 하되 선택 불가(disabled) 처리한다. 부여 자체를 막는 것은 백엔드
 * ManagerDelegationService가 아니라 여기 FE에서만 하는 임시 게이트이므로, 노무사 회신 후
 * 이 배열에서만 빼면 즉시 개방된다.
 */
export type ManagerPermission =
  | "ATTENDANCE_APPROVE"
  | "SCHEDULE_MANAGE"
  | "TIMEOFF_APPROVE"
  | "STAFF_VIEW"
  | "SUBSTITUTE_MANAGE"
  | "DASHBOARD_VIEW"
  | "RECRUITMENT_MANAGE"
  | "PAYROLL_VIEW"
  | "PAYROLL_CONFIRM"
  | "WAGE_EDIT"
  | "STAFF_DEACTIVATE"
  | "CONTRACT_MANAGE"
  | "STORE_EDIT";

export const PERMISSION_LABEL: Record<ManagerPermission, string> = {
  ATTENDANCE_APPROVE: "출퇴근 승인",
  SCHEDULE_MANAGE: "스케줄 관리",
  TIMEOFF_APPROVE: "연차/휴무 승인",
  STAFF_VIEW: "직원 조회",
  SUBSTITUTE_MANAGE: "대타·공지 관리",
  DASHBOARD_VIEW: "대시보드 조회",
  RECRUITMENT_MANAGE: "구인채용 관리",
  PAYROLL_VIEW: "급여 조회",
  PAYROLL_CONFIRM: "급여 확정",
  WAGE_EDIT: "시급 변경",
  STAFF_DEACTIVATE: "직원 비활성화",
  CONTRACT_MANAGE: "근로계약 대리",
  STORE_EDIT: "매장 정보 수정",
};

/** 노무사 검토 미완료로 FE에서 선택 자체를 막는 권한 — 부여 UI 전용 게이트. */
export const LEGAL_GATED_PERMISSIONS: ManagerPermission[] = ["CONTRACT_MANAGE", "PAYROLL_CONFIRM"];

export type SignatureEnvelopeStatus =
  | "DRAFT"
  | "READY"
  | "IN_PROGRESS"
  | "VERIFIED"
  | "EXPIRED"
  | "DECLINED"
  | "FAILED"
  | "CANCELLED"
  | "MANUAL_REISSUE_REQUIRED";

export interface ManagerView {
  employeeId: number;
  permissions: ManagerPermission[];
  delegationVersion: number;
  appointedAt: string;
  acceptedAt: string | null;
  signatureEnvelopeId: number | null;
  signatureStatus: SignatureEnvelopeStatus;
  active: boolean;
  pendingPermissions: ManagerPermission[] | null;
  pendingVersion: number | null;
}

export interface AuditView {
  action: string;
  employeeId: number;
  actorType: string;
  permissions: ManagerPermission[];
  delegationVersion: number;
  signatureEnvelopeId: number | null;
  documentSha256: string | null;
  reason: string | null;
  createdAt: string;
  accessChannel: "WEB" | "MOBILE";
}

export interface PermissionUpdateView {
  signatureRequired: boolean;
  envelopeId: number | null;
  delegationVersion: number;
  permissions: ManagerPermission[];
}

/** 매장 매니저 목록 — GET /api/stores/{storeId}/managers. */
export function fetchManagers(storeId: number): Promise<ManagerView[]> {
  return apiFetch<ManagerView[]>(`/api/stores/${storeId}/managers`);
}

/** 매니저 임명(전자서명 위임장 발송) — POST /api/stores/{storeId}/managers. */
export function appointManager(
  storeId: number,
  employeeId: number,
  permissions: ManagerPermission[],
): Promise<{ envelopeId: number; status: string }> {
  return apiFetch(`/api/stores/${storeId}/managers`, {
    method: "POST",
    body: JSON.stringify({ employeeId, permissions }),
  });
}

/** 매니저 권한 수정 — PUT /api/stores/{storeId}/managers/{employeeId}. */
export function updateManagerPermissions(
  storeId: number,
  employeeId: number,
  permissions: ManagerPermission[],
): Promise<PermissionUpdateView> {
  return apiFetch(`/api/stores/${storeId}/managers/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
}

/** 매니저 위임 회수 — DELETE /api/stores/{storeId}/managers/{employeeId}. */
export function revokeManager(storeId: number, employeeId: number, reason?: string): Promise<void> {
  return apiFetch<void>(`/api/stores/${storeId}/managers/${employeeId}`, {
    method: "DELETE",
    body: reason ? JSON.stringify({ reason }) : undefined,
  });
}

/** 위임 감사이력 — GET /api/stores/{storeId}/delegation-audit. */
export function fetchDelegationAudit(storeId: number, page = 0, size = 50): Promise<AuditView[]> {
  return apiFetch<AuditView[]>(`/api/stores/${storeId}/delegation-audit?page=${page}&size=${size}`);
}
