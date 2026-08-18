import MockAdapter from 'axios-mock-adapter';
import {__testing__} from '../../../src/common/api/client';
import {
    fetchCycleLaborRatio,
    fetchDailyLaborRatios,
    fetchRecentSales,
    upsertDailySales,
} from '../../../src/features/sales/services/salesService';

// [Test Mapping] H-11 — sales 도메인 서비스 최소 안전망.
describe('salesService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(__testing__.getClient());
    });
    afterEach(() => {
        mock.restore();
    });

    it('upsertDailySales 는 매장 스코프 경로로 POST 한다', async () => {
        let body: any = null;
        mock.onPost('/api/stores/10/daily-sales').reply((config) => {
            body = JSON.parse(config.data);
            return [200, {id: 1, salesDate: '2026-08-18', amount: 500000}];
        });

        const payload = {salesDate: '2026-08-18', amount: 500000} as any;
        await expect(upsertDailySales(10, payload)).resolves.toMatchObject({amount: 500000});
        expect(body).toEqual(payload);
    });

    it('fetchRecentSales 는 days 를 쿼리로 보낸다(기본 7일)', async () => {
        let captured: any = null;
        mock.onGet('/api/stores/10/daily-sales/recent').reply((config) => {
            captured = config;
            return [200, []];
        });

        await fetchRecentSales(10);
        expect(captured.params).toEqual({days: 7});

        await fetchRecentSales(10, 30);
        expect(captured.params).toEqual({days: 30});
    });

    it('fetchDailyLaborRatios 는 기간 쿼리를 보낸다', async () => {
        let captured: any = null;
        mock.onGet('/api/stores/10/labor-ratio/daily').reply((config) => {
            captured = config;
            return [200, []];
        });

        await fetchDailyLaborRatios(10, '2026-08-01', '2026-08-18');
        expect(captured.params).toEqual({from: '2026-08-01', to: '2026-08-18'});
    });

    it('fetchCycleLaborRatio 는 정산주기 인건비율을 조회한다', async () => {
        mock.onGet('/api/stores/10/labor-ratio/cycle').reply(200, {laborRatio: 0.28});
        await expect(fetchCycleLaborRatio(10)).resolves.toMatchObject({laborRatio: 0.28});
    });
});
