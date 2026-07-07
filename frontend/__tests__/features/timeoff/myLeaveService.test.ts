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

describe('myLeaveService.createTimeOffRequest (직원 셀프 신청)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('POST /api/timeoff/self 로 payload 그대로 전달하고 TimeOffResponse 반환', async () => {
        const responseBody = {
            id: 1,
            employeeId: 5,
            employeeName: '홍길동',
            storeId: 2,
            leaveType: 'ANNUAL',
            unit: 'FULL_DAY',
            startDate: '2026-07-10',
            endDate: '2026-07-11',
            startTime: null,
            endTime: null,
            consumedDays: 2,
            reason: '가족 행사',
            rejectReason: null,
            status: 'PENDING',
        };
        (api.post as jest.Mock).mockResolvedValue({data: responseBody});

        const payload = {
            storeId: 2,
            startDate: '2026-07-10',
            endDate: '2026-07-11',
            reason: '가족 행사',
            leaveType: 'ANNUAL' as const,
            unit: 'FULL_DAY' as const,
        };
        const result = await myLeaveService.createTimeOffRequest(payload);

        expect(api.post).toHaveBeenCalledWith('/api/timeoff/self', payload);
        expect(result.id).toBe(1);
        expect(result.status).toBe('PENDING');
    });

    it('시간단위(unit=HOURS) 신청은 startTime/endTime 을 함께 전달', async () => {
        (api.post as jest.Mock).mockResolvedValue({
            data: {
                id: 2, employeeId: 5, employeeName: '홍길동', storeId: 2,
                leaveType: 'ANNUAL', unit: 'HOURS',
                startDate: '2026-07-10', endDate: '2026-07-10',
                startTime: '09:00:00', endTime: '12:00:00',
                consumedDays: 0.5, reason: '병원', rejectReason: null, status: 'PENDING',
            },
        });

        const payload = {
            storeId: 2,
            startDate: '2026-07-10',
            endDate: '2026-07-10',
            reason: '병원',
            unit: 'HOURS' as const,
            startTime: '09:00:00',
            endTime: '12:00:00',
        };
        await myLeaveService.createTimeOffRequest(payload);

        expect(api.post).toHaveBeenCalledWith('/api/timeoff/self', payload);
    });
});
