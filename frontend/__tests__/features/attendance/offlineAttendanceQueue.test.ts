import offlineAttendanceQueue, {QueuedCheckIn} from '../../../src/features/attendance/services/offlineAttendanceQueue';
import api from '../../../src/common/utils/api';
import {unifiedStorage} from '../../../src/common/utils/unifiedStorage';

jest.mock('../../../src/common/utils/api', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
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

const sample = (over: Partial<QueuedCheckIn> = {}): QueuedCheckIn => ({
    type: 'CHECK_IN',
    employeeId: 1,
    storeId: 2,
    latitude: 37.5,
    longitude: 127.0,
    queuedAt: '2026-05-23T10:00:00.000Z',
    ...over,
});

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
            expect(r).toEqual({succeeded: 0, failed: 0});
            expect(api.post).not.toHaveBeenCalled();
        });

        it('CHECK_IN/CHECK_OUT 별 올바른 엔드포인트로 POST 한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_IN'}));
            await offlineAttendanceQueue.enqueue(sample({type: 'CHECK_OUT'}));

            const r = await offlineAttendanceQueue.flush();

            expect(r).toEqual({succeeded: 2, failed: 0});
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
            expect(r).toEqual({succeeded: 0, failed: 2});
            expect(await offlineAttendanceQueue.size()).toBe(2);
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
