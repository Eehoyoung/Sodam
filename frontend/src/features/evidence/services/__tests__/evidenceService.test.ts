import {fetchEvidencePackage, toIsoDate} from '../evidenceService';
import api from '../../../../common/utils/api';

jest.mock('../../../../common/utils/api', () => ({
    __esModule: true,
    default: {get: jest.fn()},
}));

const mockedGet = api.get as jest.Mock;

describe('evidenceService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('toIsoDate가 YYYY-MM-DD 형식으로 변환한다', () => {
        expect(toIsoDate(new Date(2026, 2, 5))).toBe('2026-03-05');
        expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('fetchEvidencePackage가 storeId·employeeId·기간으로 호출하고 데이터를 반환한다', async () => {
        const payload = {
            storeId: 1,
            employeeId: 10,
            employeeName: '김알바',
            from: '2026-03-01',
            to: '2026-05-31',
            attendance: {workedDays: 2, recordCount: 3, totalWorkedMinutes: 720, totalWorkedHours: 12},
            payroll: {payslipCount: 2, totalGrossWage: 2200000, totalNetWage: 2127400, totalDeduction: 72600},
            contract: {
                hasContract: true,
                hourlyWage: 10030,
                contractedHoursPerWeek: 20,
                weeklyHolidayDay: 'SUNDAY',
                startDate: '2026-01-01',
                endDate: null,
                signed: true,
            },
            wageHistory: [
                {scope: 'EMPLOYEE_OVERRIDE', hourlyWage: 11000, effectiveFrom: '2026-04-01', reason: '성과 반영'},
            ],
            disclaimer: '참고용 자료예요.',
        };
        mockedGet.mockResolvedValueOnce({data: payload});

        const res = await fetchEvidencePackage(1, 10, '2026-03-01', '2026-05-31');

        // api.get(url, params, config) — params 를 {params: {}}로 다시 감싸면 쿼리스트링이
        // 안 나가는 이중래핑 함정이 있다(CLAUDE.md 참고). 서비스는 params 를 그대로 2번째 인자로 넘긴다.
        expect(mockedGet).toHaveBeenCalledWith(
            '/api/stores/1/employees/10/evidence',
            {from: '2026-03-01', to: '2026-05-31'},
        );
        expect(res.employeeName).toBe('김알바');
        expect(res.payroll.totalGrossWage).toBe(2200000);
        expect(res.wageHistory).toHaveLength(1);
    });
});
