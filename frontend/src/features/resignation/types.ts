export type ResignationStatus = 'PENDING' | 'WITHDRAWN' | 'ACKNOWLEDGED';

/** `EmployeeResignationController.toMap` 1:1. */
export interface ResignationRequest {
    id: number;
    storeId?: number;
    storeName?: string;
    desiredResignationDate: string;
    agreedResignationDate: string | null;
    reason: string | null;
    status: ResignationStatus;
    requestedAt: string;
    decidedAt: string | null;
    signatureEnvelopeId: number | null;
}

export type ProposerRole = 'EMPLOYEE' | 'MASTER';

export interface ResignationDateProposal {
    proposerRole: ProposerRole;
    proposedDate: string;
    proposedAt: string;
    accepted: boolean;
}

export interface SignatureRequestResult {
    available: boolean;
    envelopeId: number | null;
    message: string | null;
}
