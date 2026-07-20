import offlineAttendanceQueue, {
    EnqueueInput,
    MAX_RETRY,
} from '../../../src/features/attendance/services/offlineAttendanceQueue';
import api from '../../../src/common/api/client';
import {unifiedStorage} from '../../../src/common/utils/unifiedStorage';
import {AppToast} from '../../../src/common/components/ds';

jest.mock('../../../src/common/api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

// AppToast 는 네이티브 의존이 있어 dead-letter 알림만 모킹
jest.mock('../../../src/common/components/ds', () => ({
    __esModule: true,
    AppToast: {success: jest.fn(), error: jest.fn(), warn: jest.fn(), show: jest.fn()},
}));

// unifiedStorage 는 메모리 fallback 가능하므로 직접 모킹하여 결정성 확보
jest.mock('../../../src/common/utils/unifiedStorage', () => {
    const store: Record<string, string> = {};
    return {
        unifiedStorage: {
            getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
            setItem: jest.fn(async (k: string, v: string) => {
                store[k] = v;
            }),
            removeItem: jest.fn(async (k: string) => {
                delete store[k];
            }),
            // 테스트 헬퍼: 내부 store 접근
            __dump: () => store,
            __reset: () => {
                for (const k of Object.keys(store)) delete store[k];
            },
        },
    };
});

const sample = (over: Partial<EnqueueInput> = {}): EnqueueInput => ({
    type: 'CHECK_IN',
    employeeId: 1,
    storeId: 2,
    latitude: 37.5,
    longitude: 127.0,
    queuedAt: '2026-05-23T10:00:00.000Z',
    ...over,
});

/** queuedAt 누락 시 큐가 자동 채우는 경로 테스트용 */
const sampleNoQueuedAt = (over: Partial<EnqueueInput> = {}): EnqueueInput => {
    const base = sample(over);
    const {queuedAt: _drop, ...rest} = base;
    return rest;
};

describe('offlineAttendanceQueue', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        (unifiedStorage as any).__reset?.();
    });

    describe('enqueue / size', () => {
        it('enqueue 후 size 가 증가한다', async () => {
            expect(await offlineAttendanceQueue.size()).toBe(0);
            await offlineAttendanceQueue.enqueue(sample());
            expect(await offlineAttendanceQueue.size()).toBe(1);
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_OUT'}));
            expect(await offlineAttendanceQueue.size()).toBe(2);
        });
    });

    describe('flush', () => {
        it('큐가 비었으면 succeeded=0, failed=0', async () => {
            const r = await offlineAttendanceQueue.flush();
            expect(r).toEqual({succeeded: 0, failed: 0, dropped: 0});
            expect(api.post).not.toHaveBeenCalled();
        });

        it('CHECK_IN/CHECK_OUT 별 올바른 엔드포인트로 POST 한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_IN'}));
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_OUT'}));

            const r = await offlineAttendanceQueue.flush();

            expect(r).toEqual({succeeded: 2, failed: 0, dropped: 0});
            expect(api.post).toHaveBeenNthCalledWith(
                1,
                '/api/attendance/check-in',
                expect.objectContaining({employeeId: 1, storeId: 2})
            );
            expect(api.post).toHaveBeenNthCalledWith(
                2,
                '/api/attendance/check-out',
                expect.objectContaining({employeeId: 1, storeId: 2})
            );
            expect(await offlineAttendanceQueue.size()).toBe(0);
        });

        it('실패한 항목은 큐에 남는다', async () => {
            // 첫 번째 성공, 두 번째 실패
            (api.post as jest.Mock)
                .mockResolvedValueOnce({data: {}})
                .mockRejectedValueOnce(new Error('network'));

            await offlineAttendanceQueue.enqueue(sample({employeeId: 1}));
            await offlineAttendanceQueue.enqueue(sample({employeeId: 2}));

            const r = await offlineAttendanceQueue.flush();
            expect(r.succeeded).toBe(1);
            expect(r.failed).toBe(1);
            expect(await offlineAttendanceQueue.size()).toBe(1);
        });

        it('모두 실패하면 큐는 그대로 유지', async () => {
            (api.post as jest.Mock).mockRejectedValue(new Error('offline'));
            await offlineAttendanceQueue.enqueue(sample());
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_OUT'}));

            const r = await offlineAttendanceQueue.flush();
            expect(r).toEqual({succeeded: 0, failed: 2, dropped: 0});
            expect(await offlineAttendanceQueue.size()).toBe(2);
        });

        it('flush 시 payload 에 queuedAt(ISO) 를 포함해 전송한다 (T1-3 계약)', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await offlineAttendanceQueue.enqueue(sample({queuedAt: '2026-05-23T10:00:00.000Z'}));

            await offlineAttendanceQueue.flush();

            expect(api.post).toHaveBeenCalledWith(
                '/api/attendance/check-in',
                expect.objectContaining({queuedAt: '2026-05-23T10:00:00.000Z'}),
            );
        });

        it('queuedAt 미지정 시 enqueue 가 ISO 문자열을 자동 기록한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await offlineAttendanceQueue.enqueue(sampleNoQueuedAt());

            await offlineAttendanceQueue.flush();

            const payload = (api.post as jest.Mock).mock.calls[0][1];
            expect(typeof payload.queuedAt).toBe('string');
            // ISO-8601 형태 검증
            expect(payload.queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        it('MAX_RETRY 회 실패하면 dead-letter 로 큐에서 제거하고 사용자에게 알린다', async () => {
            (api.post as jest.Mock).mockRejectedValue(new Error('offline'));
            await offlineAttendanceQueue.enqueue(sample());

            // MAX_RETRY-1 회까지는 큐에 남아 retryCount 누적
            for (let i = 0; i < MAX_RETRY - 1; i++) {
                const r = await offlineAttendanceQueue.flush();
                expect(r.failed).toBe(1);
                expect(r.dropped).toBe(0);
                expect(await offlineAttendanceQueue.size()).toBe(1);
            }

            // MAX_RETRY 번째 실패 → dead-letter 제거 + 토스트
            const last = await offlineAttendanceQueue.flush();
            expect(last.dropped).toBe(1);
            expect(last.failed).toBe(0);
            expect(await offlineAttendanceQueue.size()).toBe(0);
            expect(AppToast.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('clear', () => {
        it('모든 큐 항목을 제거한다', async () => {
            await offlineAttendanceQueue.enqueue(sample());
            await offlineAttendanceQueue.enqueue(sample());
            expect(await offlineAttendanceQueue.size()).toBe(2);

            await offlineAttendanceQueue.clear();
            expect(await offlineAttendanceQueue.size()).toBe(0);
        });
    });
});
