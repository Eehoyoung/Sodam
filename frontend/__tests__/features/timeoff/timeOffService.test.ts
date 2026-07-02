import timeOffService from '../../../src/features/myPage/services/timeOffService';
import api from '../../../src/common/utils/api';

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

// [Test Mapping] TimeOff DTO 정합 — silent fail 회귀 방지 (FE_BE_DTO_GAP P0.9)
// BE TimeOffCreateRequest = {employeeId, storeId, startDate, endDate, reason}
// 모두 @NotNull — 이전 회귀: FE 가 from/to 키 + reason 누락 가능.

describe('timeOffService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('startDate/endDate/reason 키로 POST /api/timeoff', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 99}});

            await timeOffService.create({
                employeeId: 5,
                storeId: 2,
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                reason: '병가',
            });

            expect(api.post).toHaveBeenCalledWith('/api/timeoff', {
                employeeId: 5,
                storeId: 2,
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                reason: '병가',
            });
        });

        it('응답 envelope({data:{id}}) 해체', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {data: {id: 77}}});

            const result = await timeOffService.create({
                employeeId: 1, storeId: 1,
                startDate: '2026-06-01', endDate: '2026-06-01', reason: '개인사정',
            });

            expect(result.id).toBe(77);
        });
    });

    describe('getStoreAll', () => {
        it('storeId 경로로 GET, 배열 반환', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: [{id: 1, employeeId: 5, storeId: 2, status: 'PENDING', startDate: '2026-06-01', endDate: '2026-06-01'}],
            });

            const list = await timeOffService.getStoreAll(2);

            expect(api.get).toHaveBeenCalledWith('/api/timeoff/store/2');
            expect(list).toHaveLength(1);
        });

        it('응답이 배열이 아니면 빈 배열로 정규화', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: null});

            const list = await timeOffService.getStoreAll(2);

            expect(list).toEqual([]);
        });
    });

    describe('getByStatus', () => {
        it('PENDING 상태 필터', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await timeOffService.getByStatus(2, 'PENDING');

            expect(api.get).toHaveBeenCalledWith('/api/timeoff/store/2/status/PENDING');
        });

        it('APPROVED 상태 필터', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await timeOffService.getByStatus(2, 'APPROVED');

            expect(api.get).toHaveBeenCalledWith('/api/timeoff/store/2/status/APPROVED');
        });
    });

    describe('approve / reject', () => {
        it('approve 는 PUT /api/timeoff/{id}/approve', async () => {
            (api.put as jest.Mock).mockResolvedValue({data: {success: true}});

            await timeOffService.approve(42);

            expect(api.put).toHaveBeenCalledWith('/api/timeoff/42/approve');
        });

        it('reject 는 PUT /api/timeoff/{id}/reject', async () => {
            (api.put as jest.Mock).mockResolvedValue({data: {success: true}});

            await timeOffService.reject(42);

            expect(api.put).toHaveBeenCalledWith('/api/timeoff/42/reject');
        });
    });
});
