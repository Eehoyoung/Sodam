import myLeaveService from '../../../src/features/timeoff/services/myLeaveService';
import api from '../../../src/common/utils/api';

jest.mock('../../../src/common/utils/api', () => ({
    __esModule: true,
    default: {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(), patch: jest.fn()},
}));

describe('myLeaveService.getMyLeaveBalance (E-NEW-03)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('GET /api/timeoff/my/leave-balance 를 호출하고 잔여 연차를 반환', async () => {
        (api.get as jest.Mock).mockResolvedValue({
            data: {
                entitledDays: 15,
                usedDays: 3,
                remainingDays: 12,
                fiveOrMoreApplicable: true,
                disclaimer: '참고용 추정이에요.',
            },
        });

        const result = await myLeaveService.getMyLeaveBalance();

        expect((api.get as jest.Mock).mock.calls[0][0]).toBe('/api/timeoff/my/leave-balance');
        expect(result.remainingDays).toBe(12);
        expect(result.fiveOrMoreApplicable).toBe(true);
        expect(result.disclaimer).toBeTruthy();
    });

    it('5인 미만: fiveOrMoreApplicable false·발생/잔여 0', async () => {
        (api.get as jest.Mock).mockResolvedValue({
            data: {entitledDays: 0, usedDays: 0, remainingDays: 0, fiveOrMoreApplicable: false, disclaimer: 'x'},
        });
        const result = await myLeaveService.getMyLeaveBalance();
        expect(result.fiveOrMoreApplicable).toBe(false);
        expect(result.entitledDays).toBe(0);
        expect(result.remainingDays).toBe(0);
    });

    it('필드 누락 시 안전 폴백(0·false·기본 면책문구)', async () => {
        (api.get as jest.Mock).mockResolvedValue({data: {}});
        const result = await myLeaveService.getMyLeaveBalance();
        expect(result.entitledDays).toBe(0);
        expect(result.fiveOrMoreApplicable).toBe(false);
        expect(result.disclaimer).toBeTruthy();
    });
});
