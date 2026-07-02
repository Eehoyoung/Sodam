import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import api from '../../../common/utils/api';
import {AppToast} from '../../../common/components/ds';
import {logger} from '../../../utils/logger';

const QUEUE_KEY = 'attendance.offlineQueue.v1';
const LOG_CONTEXT = 'OFFLINE_ATTENDANCE_QUEUE';

/** flush 재시도 한도 — 초과 시 큐에서 제거(dead-letter)하고 사용자에게 알린다. 무한 누적 방지. */
export const MAX_RETRY = 5;

export interface QueuedCheckIn {
    type: 'CHECK_IN' | 'CHECK_OUT';
    employeeId: number;
    storeId: number;
    latitude: number;
    longitude: number;
    /** 큐 enqueue 시각(ISO-8601) — 복구 시 BE 측에서 wall-clock 으로 적용. enqueue 시 자동 기록. */
    queuedAt: string;
    /** flush 실패 누적 횟수. MAX_RETRY 초과 시 dead-letter 처리. */
    retryCount: number;
}

/** enqueue 입력 — queuedAt/retryCount 는 큐가 자동 채운다. */
export type EnqueueInput = Omit<QueuedCheckIn, 'queuedAt' | 'retryCount'> &
    Partial<Pick<QueuedCheckIn, 'queuedAt'>>;

/**
 * 출퇴근 오프라인 큐.
 *
 * 동작:
 *  1) 네트워크 끊김 또는 401/5xx 시 enqueue (queuedAt 자동 기록)
 *  2) 앱 포그라운드 진입 또는 네트워크 복구 시 flush 시도
 *  3) 성공한 항목은 큐에서 제거, 실패는 retryCount++ 후 재시도 (최대 MAX_RETRY회)
 *  4) MAX_RETRY 초과 항목은 dead-letter 로 큐에서 제거 + 사용자 토스트/경고 로그
 *
 * 계약:
 *  - flush 시 payload 에 queuedAt(ISO 문자열) 포함 전송. BE 가 옵셔널 수락.
 *
 * 보안 메모:
 *  - 큐는 단말 로컬에만 저장 (AsyncStorage)
 *  - 토큰 만료 시 refresh interceptor 가 자동 처리 (api.ts)
 */
export const offlineAttendanceQueue = {
    async enqueue(item: EnqueueInput): Promise<void> {
        const list = await readQueue();
        list.push({
            ...item,
            queuedAt: item.queuedAt ?? new Date().toISOString(),
            retryCount: 0,
        });
        await writeQueue(list);
    },

    async flush(): Promise<{succeeded: number; failed: number; dropped: number}> {
        const list = await readQueue();
        if (list.length === 0) {
            return {succeeded: 0, failed: 0, dropped: 0};
        }

        let succeeded = 0;
        let dropped = 0;
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
                    queuedAt: it.queuedAt,
                });
                succeeded++;
            } catch (error) {
                const nextRetry = (it.retryCount ?? 0) + 1;
                if (nextRetry >= MAX_RETRY) {
                    // dead-letter: 무한 재시도 누적 방지 — 큐에서 제거하고 사용자에게 알림
                    dropped++;
                    logger.warn(
                        `오프라인 출퇴근 기록 ${MAX_RETRY}회 전송 실패 — 큐에서 제거`,
                        LOG_CONTEXT,
                        {type: it.type, storeId: it.storeId, queuedAt: it.queuedAt},
                    );
                } else {
                    remaining.push({...it, retryCount: nextRetry});
                    logger.warn('오프라인 출퇴근 기록 전송 실패 — 재시도 예정', LOG_CONTEXT, {
                        type: it.type,
                        retryCount: nextRetry,
                        error: toMessage(error),
                    });
                }
            }
        }
        await writeQueue(remaining);

        if (dropped > 0) {
            AppToast.error(
                `오프라인 출퇴근 기록 ${dropped}건을 전송하지 못했어요. 직접 다시 기록해 주세요.`,
            );
        }
        return {succeeded, failed: remaining.length, dropped};
    },

    async size(): Promise<number> {
        return (await readQueue()).length;
    },

    async clear(): Promise<void> {
        await writeQueue([]);
    },
};

function toMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return typeof error === 'string' ? error : 'unknown';
}

async function readQueue(): Promise<QueuedCheckIn[]> {
    try {
        const raw = await unifiedStorage.getItem(QUEUE_KEY);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw) as Array<Partial<QueuedCheckIn>>;
        if (!Array.isArray(parsed)) {
            return [];
        }
        // 구버전(retryCount/queuedAt 누락) 호환 — 누락 필드 보정
        return parsed.map((it): QueuedCheckIn => ({
            type: it.type === 'CHECK_OUT' ? 'CHECK_OUT' : 'CHECK_IN',
            employeeId: it.employeeId ?? 0,
            storeId: it.storeId ?? 0,
            latitude: it.latitude ?? 0,
            longitude: it.longitude ?? 0,
            queuedAt: it.queuedAt ?? new Date().toISOString(),
            retryCount: it.retryCount ?? 0,
        }));
    } catch (error) {
        logger.warn('오프라인 큐 읽기 실패 — 빈 큐로 복구', LOG_CONTEXT, {error: toMessage(error)});
        return [];
    }
}

async function writeQueue(list: QueuedCheckIn[]): Promise<void> {
    try {
        await unifiedStorage.setItem(QUEUE_KEY, JSON.stringify(list));
    } catch (error) {
        // quota 초과 등 로컬 저장 실패 — 조용히 삼키지 말고 경고 로그
        logger.warn('오프라인 큐 저장 실패(저장공간 부족 가능)', LOG_CONTEXT, {
            size: list.length,
            error: toMessage(error),
        });
    }
}

export default offlineAttendanceQueue;
