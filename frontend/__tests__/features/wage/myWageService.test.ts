import myWageService from '../../../src/features/wage/services/myWageService';
import api from '../../../src/common/utils/api';

jest.mock('../../../src/common/utils/api', () => ({
    __esModule: true,
    default: {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn()},
}));

describe('myWageService.getMyWageHistory (E-NEW-02)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('GET /api/wage/my/history 를 호출하고 응답을 그대로 정규화한다', async () => {
        (api.get as jest.Mock).mockResolvedValue({
            data: {
                currentHourlyWage: 12000,
                history: [
                    {effectiveFrom: '2026-03-01', hourlyWage: 12000, scope: 'EMPLOYEE_OVERRIDE', reason: '인상'},
                    {effectiveFrom: '2026-01-01', hourlyWage: 10000, scope: 'STORE_DEFAULT', reason: '최초'},
                ],
            },
        });

        const result = await myWageService.getMyWageHistory();

        expect((api.get as jest.Mock).mock.calls[0][0]).toBe('/api/wage/my/history');
        expect(result.currentHourlyWage).toBe(12000);
        expect(result.history).toHaveLength(2);
        expect(result.history[0].scope).toBe('EMPLOYEE_OVERRIDE');
    });

    it('소속 매장 없음: currentHourlyWage null·빈 이력으로 안전 폴백', async () => {
        (api.get as jest.Mock).mockResolvedValue({data: {currentHourlyWage: null, history: []}});
        const result = await myWageService.getMyWageHistory();
        expect(result.currentHourlyWage).toBeNull();
        expect(result.history).toEqual([]);
    });

    it('history 가 누락돼도 빈 배열로 폴백', async () => {
        (api.get as jest.Mock).mockResolvedValue({data: {}});
        const result = await myWageService.getMyWageHistory();
        expect(result.history).toEqual([]);
        expect(result.currentHourlyWage).toBeNull();
    });
});
