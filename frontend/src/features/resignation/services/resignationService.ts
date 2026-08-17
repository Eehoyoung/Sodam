import api from '../../../common/api/client';
import {ResignationDateProposal, ResignationRequest, SignatureRequestResult} from '../types';

const base = (storeId: number) => `/api/stores/${storeId}/resignation-requests`;

/** [직원] 사직서 제출. */
async function submit(storeId: number, desiredResignationDate: string, reason?: string): Promise<ResignationRequest> {
    const {data} = await api.post<ResignationRequest>(base(storeId), {desiredResignationDate, reason});
    return data;
}

/** [직원] 철회. */
async function withdraw(storeId: number, id: number): Promise<void> {
    await api.put(`${base(storeId)}/${id}/withdraw`);
}

/** [사장] 매장 내 사직서 목록. */
async function listForStore(storeId: number): Promise<ResignationRequest[]> {
    const {data} = await api.get<ResignationRequest[]>(base(storeId));
    return data;
}

/** [사장] 확인(비활성화 아님) — 협의 확정 후에만 가능. */
async function acknowledge(storeId: number, id: number): Promise<void> {
    await api.put(`${base(storeId)}/${id}/acknowledge`);
}

/** [직원 본인] 내 사직서 이력. */
async function myRequests(): Promise<ResignationRequest[]> {
    const {data} = await api.get<ResignationRequest[]>('/api/resignation-requests/me');
    return data;
}

/** [신청자 본인 또는 사장] 상대의 마지막 제안에 동의. */
async function agree(storeId: number, id: number): Promise<void> {
    await api.put(`${base(storeId)}/${id}/agree`);
}

/** [신청자 본인 또는 사장] 대안 날짜 역제안. */
async function counterPropose(storeId: number, id: number, proposedDate: string): Promise<void> {
    await api.put(`${base(storeId)}/${id}/counter-propose`, {proposedDate});
}

/** 협의 이력(당사자만). */
async function proposals(storeId: number, id: number): Promise<ResignationDateProposal[]> {
    const {data} = await api.get<ResignationDateProposal[]>(`${base(storeId)}/${id}/proposals`);
    return data;
}

/** [사장] 전자서명 요청 — 전자서명 통합 비활성 시 available=false로 응답(에러 아님). */
async function requestSignature(storeId: number, id: number): Promise<SignatureRequestResult> {
    const {data} = await api.post<SignatureRequestResult>(`${base(storeId)}/${id}/request-signature`);
    return data;
}

const resignationService = {
    submit,
    withdraw,
    listForStore,
    acknowledge,
    myRequests,
    agree,
    counterPropose,
    proposals,
    requestSignature,
};

export default resignationService;
