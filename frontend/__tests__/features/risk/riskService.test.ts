import {
    fetchLaborRisks,
    fetchStatutoryHeadcount,
    simulateStatutoryHeadcount,
} from '../../../src/features/risk/services/riskService';
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

// [contract] 260815 WP-1 / 260816 WP-A: GET /api/stores/{storeId}/labor-risk/statutory-headcount(/simulate)

describe('riskService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fetchLaborRisks', () => {
        it('items 배열을 그대로 반환', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {items: [{type: 'CONTRACT_UNSIGNED', severity: 'DANGER', employeeId: 1, employeeName: '김직원', message: 'm'}]},
            });

            const list = await fetchLaborRisks(7);

            expect(api.get).toHaveBeenCalledWith('/api/stores/7/labor-risk');
            expect(list).toHaveLength(1);
        });

        it('items 누락 시 빈 배열 fallback', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: {}});

            const list = await fetchLaborRisks(7);

            expect(list).toEqual([]);
        });
    });

    describe('fetchStatutoryHeadcount', () => {
        it('상시근로자 참고 산정 + 로드맵 응답을 그대로 반환', async () => {
            const body = {
                storeId: 7,
                periodStart: '2026-07-15',
                periodEnd: '2026-08-14',
                operatingDays: 10,
                manDays: 49,
                statutoryHeadcount: 4.9,
                meetsThreshold: false,
                roadmap: [{stage: 1, expectedYear: 2027, title: '제목', description: '설명'}],
                disclaimer: '참고용',
            };
            (api.get as jest.Mock).mockResolvedValue({data: body});

            const res = await fetchStatutoryHeadcount(7);

            expect(api.get).toHaveBeenCalledWith('/api/stores/7/labor-risk/statutory-headcount');
            expect(res).toEqual(body);
        });
    });

    describe('simulateStatutoryHeadcount', () => {
        it('기본 additionalEmployees=1로 쿼리 파라미터를 실어 요청한다', async () => {
            const body = {
                storeId: 7,
                currentStatutoryHeadcount: 4.9,
                additionalEmployees: 1,
                projectedStatutoryHeadcount: 5.9,
                crossesThreshold: true,
                newlyApplicableProvisions: ['연장·야간·휴일근로 가산수당(§56)'],
                estimatedMonthlyCostMin: 660_000,
                estimatedMonthlyCostMax: 2_155_680,
                disclaimer: '참고용',
            };
            (api.get as jest.Mock).mockResolvedValue({data: body});

            const res = await simulateStatutoryHeadcount(7);

            // api.get(url, params) — params는 두 번째 인자로 직접 전달(이중 래핑 아님).
            expect(api.get).toHaveBeenCalledWith(
                '/api/stores/7/labor-risk/statutory-headcount/simulate',
                {additionalEmployees: 1},
            );
            expect(res.crossesThreshold).toBe(true);
        });

        it('additionalEmployees를 명시하면 그 값으로 요청한다', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: {}});

            await simulateStatutoryHeadcount(7, 3);

            expect(api.get).toHaveBeenCalledWith(
                '/api/stores/7/labor-risk/statutory-headcount/simulate',
                {additionalEmployees: 3},
            );
        });
    });
});
