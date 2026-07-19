import api from '../../../common/utils/api';

export interface CorrectionRequestPayload {
    proposedCheckIn: string;
    proposedCheckOut: string;
    reason: string;
}

const attendanceCorrectionService = {
    // [API Mapping] POST /api/attendance/{attendanceId}/correction-request — 직원이 사장에게 정정 요청
    request: async (attendanceId: number, payload: CorrectionRequestPayload): Promise<void> => {
        await api.post(`/api/attendance/${attendanceId}/correction-request`, payload);
    },
};

export default attendanceCorrectionService;
