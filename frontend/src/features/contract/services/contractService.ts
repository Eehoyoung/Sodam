/**
 * S1 전자 근로계약서 — API 클라이언트.
 * BE LaborContractController 엔드포인트와 1:1 매핑.
 */
import api from '../../../common/utils/api';
import type {LaborContract, LaborContractContext, LaborContractCreatePayload} from '../types';

/**
 * axios 에러에서 사용자용 메시지를 안전하게 추출한다(any 미사용).
 */
export function contractErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as {response?: {data?: {message?: unknown}}}).response;
        const message = response?.data?.message;
        if (typeof message === 'string' && message.trim().length > 0) {
            return message;
        }
    }
    return fallback;
}

export const contractService = {
    /** 직원 본인 근로계약서 목록 */
    async getMyContracts(): Promise<LaborContract[]> {
        const res = await api.get<LaborContract[]>('/api/labor-contracts/my');
        return res.data;
    },

    /** 직원 본인 서명(동의). 서명 이미지(base64)는 선택 — 멱등, 이미 서명됐으면 기존 시각 유지. */
    async sign(contractId: number, signatureImage?: string | null): Promise<LaborContract> {
        const res = await api.post<LaborContract>(`/api/labor-contracts/${contractId}/sign`, {
            signatureImage: signatureImage ?? null,
        });
        return res.data;
    },

    /** 사장: 특정 직원의 근로계약서 목록 */
    async getStoreEmployeeContracts(storeId: number, employeeId: number): Promise<LaborContract[]> {
        const res = await api.get<LaborContract[]>(
            `/api/stores/${storeId}/employees/${employeeId}/labor-contracts`,
        );
        return res.data;
    },

    /** 사장: 근로계약서 작성 화면 보조정보(당사자 정보·최저임금·가산율) */
    async getContext(storeId: number, employeeId: number): Promise<LaborContractContext> {
        const res = await api.get<LaborContractContext>(
            `/api/stores/${storeId}/labor-contracts/context`,
            {employeeId},
        );
        return res.data;
    },

    /** 사장: 근로계약서 작성·저장 */
    async create(storeId: number, payload: LaborContractCreatePayload): Promise<LaborContract> {
        const res = await api.post<LaborContract>(
            `/api/stores/${storeId}/labor-contracts`,
            payload,
        );
        return res.data;
    },

    /** 사장: 직원에게 발송(인박스 알림 적재) */
    async send(storeId: number, contractId: number): Promise<void> {
        await api.post<void>(`/api/stores/${storeId}/labor-contracts/${contractId}/send`);
    },
};

export default contractService;
