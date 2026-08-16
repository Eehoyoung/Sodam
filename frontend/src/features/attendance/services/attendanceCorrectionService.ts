import api from '../../../common/api/client';

export interface CorrectionRequestPayload {
    proposedCheckIn: string;
    proposedCheckOut: string;
    reason: string;
}

export interface ReasonRefineResult {
    refined: string;
    changed: boolean;
}

const attendanceCorrectionService = {
    // [API Mapping] POST /api/attendance/{attendanceId}/correction-request — 직원이 사장에게 정정 요청
    request: async (attendanceId: number, payload: CorrectionRequestPayload): Promise<void> => {
        await api.post(`/api/attendance/${attendanceId}/correction-request`, payload);
    },
    // [API Mapping] POST /api/attendance/{attendanceId}/correction-request/reason-refine — 사유 다듬기(WP-1, LLM 미활성 시 원본 그대로 반환)
    refineReason: async (attendanceId: number, reason: string): Promise<ReasonRefineResult> => {
        const {data} = await api.post(`/api/attendance/${attendanceId}/correction-request/reason-refine`, {reason});
        return data as ReasonRefineResult;
    },
};

export default attendanceCorrectionService;
