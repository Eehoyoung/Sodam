export type ManagerPermission =
    | 'ATTENDANCE_APPROVE'
    | 'SCHEDULE_MANAGE'
    | 'TIMEOFF_APPROVE'
    | 'STAFF_VIEW'
    | 'SUBSTITUTE_MANAGE'
    | 'DASHBOARD_VIEW'
    | 'RECRUITMENT_MANAGE'
    | 'PAYROLL_VIEW'
    | 'PAYROLL_CONFIRM'
    | 'WAGE_EDIT'
    | 'STAFF_DEACTIVATE'
    | 'CONTRACT_MANAGE'
    | 'STORE_EDIT';

export type SignatureEnvelopeStatus =
    | 'DRAFT'
    | 'IN_PROGRESS'
    | 'VERIFIED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'FAILED'
    | 'CANCELLED'
    | 'MANUAL_REISSUE_REQUIRED';

export interface ManagedStore {
    storeId: number;
    storeName: string;
    permissions: ManagerPermission[];
    delegationVersion: number;
    acceptedAt?: string | null;
    signatureEnvelopeId?: number | null;
    signatureStatus?: SignatureEnvelopeStatus | null;
    active: boolean;
}

export interface StoreManager {
    employeeId: number;
    permissions: ManagerPermission[];
    delegationVersion: number;
    appointedAt?: string | null;
    acceptedAt?: string | null;
    signatureEnvelopeId?: number | null;
    signatureStatus?: SignatureEnvelopeStatus | null;
    active: boolean;
    pendingPermissions?: ManagerPermission[] | null;
    pendingVersion?: number | null;
}

export interface DelegationAudit {
    action: string;
    employeeId: number;
    actorType: string;
    permissions: ManagerPermission[];
    delegationVersion: number;
    signatureEnvelopeId?: number | null;
    documentSha256?: string | null;
    reason?: string | null;
    createdAt: string;
}

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermission[] = [
    'ATTENDANCE_APPROVE',
    'SCHEDULE_MANAGE',
    'TIMEOFF_APPROVE',
    'STAFF_VIEW',
    'SUBSTITUTE_MANAGE',
    'DASHBOARD_VIEW',
];

export const MANAGER_PERMISSION_LABEL: Record<ManagerPermission, string> = {
    ATTENDANCE_APPROVE: '출퇴근 승인',
    SCHEDULE_MANAGE: '스케줄 관리',
    TIMEOFF_APPROVE: '휴가 승인',
    STAFF_VIEW: '직원 조회',
    SUBSTITUTE_MANAGE: '대타·공지 관리',
    DASHBOARD_VIEW: '운영 현황',
    RECRUITMENT_MANAGE: '채용 관리',
    PAYROLL_VIEW: '급여 조회',
    PAYROLL_CONFIRM: '급여 확정',
    WAGE_EDIT: '근로조건 변경',
    STAFF_DEACTIVATE: '직원 비활성화',
    CONTRACT_MANAGE: '계약 관리',
    STORE_EDIT: '매장 설정',
};
