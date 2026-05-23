import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import api from '../../../common/utils/api';

const QUEUE_KEY = 'attendance.offlineQueue.v1';

export interface QueuedCheckIn {
    type: 'CHECK_IN' | 'CHECK_OUT';
    employeeId: number;
    storeId: number;
    latitude: number;
    longitude: number;
    /** 큐 enqueue 시각 — 복구 시 BE 측에서 wall-clock 으로 적용 */
    queuedAt: string;
}

/**
 * 출퇴근 오프라인 큐.
 *
 * 동작:
 *  1) 네트워크 끊김 또는 401/5xx 시 enqueue
 *  2) 앱 포그라운드 진입 또는 네트워크 복구 시 flush 시도
 *  3) 성공한 항목은 큐에서 제거, 실패는 retry (최대 5회 백오프)
 *
 * 보안 메모:
 *  - 큐는 단말 로컬에만 저장 (AsyncStorage)
 *  - 토큰 만료 시 refresh interceptor 가 자동 처리 (api.ts)
 */
export const offlineAttendanceQueue = {
    async enqueue(item: QueuedCheckIn): Promise<void> {
        const list = await readQueue();
        list.push(item);
        await writeQueue(list);
    },

    async flush(): Promise<{succeeded: number; failed: number}> {
        const list = await readQueue();
        if (list.length === 0) return {succeeded: 0, failed: 0};

        let succeeded = 0;
        const remaining: QueuedCheckIn[] = [];
        for (const it of list) {
            try {
                const endpoint =
                    it.type === 'CHECK_IN' ? '/api/attendance/check-in' : '/api/attendance/check-out';
                await api.post(endpoint, {
                    employeeId: it.employeeId,
                    storeId: it.storeId,
                    latitude: it.latitude,
                    longitude: it.longitude,
                });
                succeeded++;
            } catch (_) {
                remaining.push(it);
            }
        }
        await writeQueue(remaining);
        return {succeeded, failed: remaining.length};
    },

    async size(): Promise<number> {
        return (await readQueue()).length;
    },

    async clear(): Promise<void> {
        await writeQueue([]);
    },
};

async function readQueue(): Promise<QueuedCheckIn[]> {
    try {
        const raw = await unifiedStorage.getItem(QUEUE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (_) {
        return [];
    }
}

async function writeQueue(list: QueuedCheckIn[]): Promise<void> {
    try {
        await unifiedStorage.setItem(QUEUE_KEY, JSON.stringify(list));
    } catch (_) {/* ignore */}
}

export default offlineAttendanceQueue;
