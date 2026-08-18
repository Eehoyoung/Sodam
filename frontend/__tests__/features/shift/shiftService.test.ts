import MockAdapter from 'axios-mock-adapter';
import {__testing__} from '../../../src/common/api/client';
import {
    confirmStoreWeekShifts,
    createShift,
    deleteShift,
    fetchMyShifts,
    fetchStoreShifts,
    updateShift,
} from '../../../src/features/shift/services/shiftService';

// [Test Mapping] H-11 — shift 도메인은 __tests__ 에 대응 파일이 하나도 없었다.
// 최소 안전망: 각 함수가 올바른 엔드포인트/쿼리/바디로 호출되는지 고정한다.
// (api.get 의 params 이중래핑 함정도 여기서 잡힌다 — 쿼리가 실제로 나가는지 본다.)
describe('shiftService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(__testing__.getClient());
    });
    afterEach(() => {
        mock.restore();
    });

    it('fetchMyShifts 는 from/to 를 쿼리스트링으로 보낸다', async () => {
        let captured: any = null;
        mock.onGet('/api/shifts/my').reply((config) => {
            captured = config;
            return [200, [{id: 1}]];
        });

        await expect(fetchMyShifts('2026-08-01', '2026-08-07')).resolves.toEqual([{id: 1}]);
        expect(captured.params).toEqual({from: '2026-08-01', to: '2026-08-07'});
    });

    it('fetchStoreShifts 는 매장 스코프 경로 + 기간 쿼리를 쓴다', async () => {
        let captured: any = null;
        mock.onGet('/api/stores/10/shifts').reply((config) => {
            captured = config;
            return [200, []];
        });

        await fetchStoreShifts(10, '2026-08-01', '2026-08-07');
        expect(captured.params).toEqual({from: '2026-08-01', to: '2026-08-07'});
    });

    it('createShift 는 매장 스코프 경로로 POST 한다', async () => {
        let body: any = null;
        mock.onPost('/api/stores/10/shifts').reply((config) => {
            body = JSON.parse(config.data);
            return [200, {id: 5}];
        });

        const payload = {employeeId: 3, shiftDate: '2026-08-18', startTime: '09:00', endTime: '18:00'} as any;
        await expect(createShift(10, payload)).resolves.toEqual({id: 5});
        expect(body).toEqual(payload);
    });

    it('updateShift 는 PUT, deleteShift 는 DELETE 를 쓴다', async () => {
        mock.onPut('/api/stores/10/shifts/5').reply(200, {id: 5});
        mock.onDelete('/api/stores/10/shifts/5').reply(204);

        await expect(updateShift(10, 5, {startTime: '10:00'} as any)).resolves.toEqual({id: 5});
        await expect(deleteShift(10, 5)).resolves.toBeUndefined();
    });

    it('confirmStoreWeekShifts 는 ApiResponse 래핑 응답도 평탄화한다', async () => {
        mock.onPost('/api/stores/10/shifts/notify').replyOnce(200, {confirmedCount: 3, notifiedCount: 2});
        await expect(confirmStoreWeekShifts(10, {from: '2026-08-01', to: '2026-08-07'} as any))
            .resolves.toMatchObject({confirmedCount: 3});

        mock.onPost('/api/stores/10/shifts/notify').replyOnce(200, {data: {confirmedCount: 1, notifiedCount: 1}});
        await expect(confirmStoreWeekShifts(10, {from: '2026-08-01', to: '2026-08-07'} as any))
            .resolves.toMatchObject({confirmedCount: 1});
    });
});
