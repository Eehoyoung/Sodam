export type SignatureSubjectType =
    | 'MANAGER_DELEGATION'
    | 'LABOR_CONTRACT'
    | 'EMPLOYMENT_AMENDMENT'
    | 'MINOR_GUARDIAN_CONSENT';

export type SignatureSignerRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE' | 'GUARDIAN';

export type SignaturePartyStatus =
    | 'WAITING'
    | 'REQUEST_QUEUED'
    | 'PENDING'
    | 'PROVIDER_COMPLETED'
    | 'VERIFY_QUEUED'
    | 'VERIFYING'
    | 'VERIFIED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'FAILED'
    | 'CANCELLED'
    | 'MANUAL_REISSUE_REQUIRED';

export type SignatureEnvelopeStatus =
    | 'DRAFT'
    | 'IN_PROGRESS'
    | 'VERIFIED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'FAILED'
    | 'CANCELLED'
    | 'MANUAL_REISSUE_REQUIRED';

export interface SignatureParty {
    role: SignatureSignerRole;
    order: number;
    status: SignaturePartyStatus;
    requestedAt?: string | null;
    verifiedAt?: string | null;
    expiresAt?: string | null;
}

export interface ElectronicSignatureEnvelope {
    id: number;
    subjectType: SignatureSubjectType;
    subjectId: number;
    storeId: number;
    documentVersion: number;
    documentSha256: string;
    status: SignatureEnvelopeStatus;
    currentSigningOrder: number;
    viewerPartyOrder?: number | null;
    parties: SignatureParty[];
}

export const ENVELOPE_TERMINAL_STATUSES: SignatureEnvelopeStatus[] = [
    'VERIFIED',
    'DECLINED',
    'EXPIRED',
    'FAILED',
    'CANCELLED',
    'MANUAL_REISSUE_REQUIRED',
];
