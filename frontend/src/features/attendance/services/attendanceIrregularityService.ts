/**
 * 월급제 정규직 지각/조퇴/결근 — API 클라이언트.
 * BE AttendanceIrregularityController 엔드포인트와 1:1 매핑.
 */
import api from '../../../common/api/client';
import type {AttendanceIrregularity, AttendanceNoticeType} from '../types';

export const attendanceIrregularityService = {
    /** 사장: 매장의 근태 이상 목록(자동 감지 포함) 조회. */
    async list(storeId: number, from: string, to: string): Promise<AttendanceIrregularity[]> {
        const res = await api.get<AttendanceIrregularity[]>(
            `/api/stores/${storeId}/attendance-irregularities`,
            {from, to},
        );
        return res.data;
    },

    /** 사장: 공제 없이 처리. */
    async waive(storeId: number, id: number, note?: string): Promise<AttendanceIrregularity> {
        const res = await api.post<AttendanceIrregularity>(
            `/api/stores/${storeId}/attendance-irregularities/${id}/waive`,
            note ? {note} : {},
        );
        return res.data;
    },

    /** 사장: 자동 공제 확인(감사 기록용 — 금액은 이미 정산에 반영되어 있음). */
    async deduct(storeId: number, id: number, note?: string): Promise<AttendanceIrregularity> {
        const res = await api.post<AttendanceIrregularity>(
            `/api/stores/${storeId}/attendance-irregularities/${id}/deduct`,
            note ? {note} : {},
        );
        return res.data;
    },

    /** 사장: 연차(반차/종일)로 소급 전환. */
    async convertToLeave(storeId: number, id: number, note?: string): Promise<AttendanceIrregularity> {
        const res = await api.post<AttendanceIrregularity>(
            `/api/stores/${storeId}/attendance-irregularities/${id}/convert-to-leave`,
            note ? {note} : {},
        );
        return res.data;
    },

    /** 직원 본인: 처리 완료된 근태 이상 내역 조회. */
    async myResolved(storeId: number): Promise<AttendanceIrregularity[]> {
        const res = await api.get<AttendanceIrregularity[]>(
            '/api/attendance-irregularities/my',
            {storeId},
        );
        return res.data;
    },

    /** 직원 본인: 지각/조퇴/결근 사전 신고 — 임금에는 영향 없고 사장에게만 알림. */
    async createNotice(storeId: number, forDate: string, type: AttendanceNoticeType, message?: string): Promise<void> {
        await api.post<void>(`/api/stores/${storeId}/attendance-notices`, {
            storeId,
            forDate,
            type,
            message: message ?? null,
        });
    },
};

export default attendanceIrregularityService;
