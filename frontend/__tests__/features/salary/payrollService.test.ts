import payrollService from '../../../src/features/salary/services/payrollService';
import api from '../../../src/common/api/client';

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

// [Test Mapping] Payroll DTO 키 정합 — silent fail 회귀 방지 (FE_BE_DTO_GAP P0.8)
// BE PayrollCalculationRequestDto = {employeeId?, storeId, startDate, endDate, ...}
// 이전 회귀: FE 가 from/to 키로 보내 BE 가 startDate/endDate 무시 → 빈 계산.

describe('payrollService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculate', () => {
        it('startDate/endDate 키로 POST /api/payroll/calculate', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {payrollId: 1, employeeId: 5, storeId: 2, totalPay: 1200000},
            });

            await payrollService.calculate({
                employeeId: 5,
                storeId: 2,
                startDate: '2026-05-01',
                endDate: '2026-05-31',
            });

            expect(api.post).toHaveBeenCalledWith('/api/payroll/calculate', {
                employeeId: 5,
                storeId: 2,
                startDate: '2026-05-01',
                endDate: '2026-05-31',
            });
        });

        it('employeeId 없으면 매장 전체 일괄 계산 (employeeId 키 자체 누락)', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});

            await payrollService.calculate({
                storeId: 2,
                startDate: '2026-05-01',
                endDate: '2026-05-31',
            });

            const payload = (api.post as jest.Mock).mock.calls[0][1];
            expect(payload.storeId).toBe(2);
            expect(payload.startDate).toBe('2026-05-01');
            expect(payload.endDate).toBe('2026-05-31');
            expect(payload.employeeId).toBeUndefined();
        });

        it('recalculate 옵션 전달', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});

            await payrollService.calculate({
                storeId: 1,
                startDate: '2026-05-01',
                endDate: '2026-05-31',
                recalculate: true,
            });

            expect((api.post as jest.Mock).mock.calls[0][1].recalculate).toBe(true);
        });

        it('응답 envelope({data:[...]}) 해체 — WP-04: BE는 배열을 반환하고 각 항목의 id/employee.id/employee.user.name 을 평탄화한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {data: [{id: 42, employee: {id: 5, user: {name: '홍길동'}}, netWage: 1000000}]},
            });

            const result = await payrollService.calculate({
                storeId: 2,
                startDate: '2026-05-01',
                endDate: '2026-05-31',
            });

            expect(result).toHaveLength(1);
            expect(result[0].payrollId).toBe(42);
            expect(result[0].employeeId).toBe(5);
            expect(result[0].employeeName).toBe('홍길동');
            expect(result[0].netWage).toBe(1000000);
        });
    });

    describe('getMonthly', () => {
        it('employeeId/storeId/year/month 경로 + 쿼리', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await payrollService.getMonthly(5, 2, 2026, 5);

            expect(api.get).toHaveBeenCalledWith(
                '/api/payroll/employee/5/store/2/monthly',
                {year: 2026, month: 5},
            );
        });
    });

    describe('updateStatus', () => {
        it('PAID 로 상태 변경 시 body 에 status 키 전달', async () => {
            (api.put as jest.Mock).mockResolvedValue({data: {success: true}});

            await payrollService.updateStatus(7, 'PAID');

            expect(api.put).toHaveBeenCalledWith('/api/payroll/7/status', {status: 'PAID'});
        });

        it('CANCELLED 상태로 변경 (24시간 이내 취소)', async () => {
            (api.put as jest.Mock).mockResolvedValue({data: {success: true}});

            await payrollService.updateStatus(7, 'CANCELLED');

            expect((api.put as jest.Mock).mock.calls[0][1]).toEqual({status: 'CANCELLED'});
        });
    });

    describe('listByEmployee', () => {
        it('startDate/endDate 쿼리 (옵션)', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await payrollService.listByEmployee(5, '2026-01-01', '2026-05-31');

            expect(api.get).toHaveBeenCalledWith(
                '/api/payroll/employee/5',
                {startDate: '2026-01-01', endDate: '2026-05-31'},
            );
        });

        it('날짜 미지정 시 undefined 그대로 전달 (BE 가 디폴트 처리)', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await payrollService.listByEmployee(5);

            expect(api.get).toHaveBeenCalledWith(
                '/api/payroll/employee/5',
                {startDate: undefined, endDate: undefined},
            );
        });
    });

    describe('listByStore', () => {
        it('storeId 경로 + startDate/endDate 쿼리', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: []});

            await payrollService.listByStore(2, '2026-05-01', '2026-05-31');

            expect(api.get).toHaveBeenCalledWith(
                '/api/payroll/store/2',
                {startDate: '2026-05-01', endDate: '2026-05-31'},
            );
        });
    });
});
