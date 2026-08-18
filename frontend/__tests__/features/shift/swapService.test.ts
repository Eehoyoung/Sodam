import MockAdapter from 'axios-mock-adapter';
import {__testing__} from '../../../src/common/api/client';
import {
    approveSwapRequest,
    cancelSwapRequest,
    createSwapRequest,
    fetchSwapRequests,
} from '../../../src/features/shift/services/swapService';
import {applySwap, fetchOpenSwaps} from '../../../src/features/shift/services/swapBoardService';

// [Test Mapping] H-11 — 대타(swap) 도메인 서비스 최소 안전망.
describe('swapService / swapBoardService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(__testing__.getClient());
    });
    afterEach(() => {
        mock.restore();
    });

    it('fetchSwapRequests 는 status 를 쿼리로 보내고 배열이 아니면 빈 배열을 준다', async () => {
        let captured: any = null;
        mock.onGet('/api/stores/10/swap-requests').replyOnce((config) => {
            captured = config;
            return [200, [{id: 1}]];
        });
        await expect(fetchSwapRequests(10, 'OPEN')).resolves.toEqual([{id: 1}]);
        expect(captured.params).toEqual({status: 'OPEN'});

        mock.onGet('/api/stores/10/swap-requests').replyOnce(200, {message: 'not an array'});
        await expect(fetchSwapRequests(10)).resolves.toEqual([]);
    });

    it('createSwapRequest / approveSwapRequest / cancelSwapRequest 엔드포인트 고정', async () => {
        let approveBody: any = null;
        mock.onPost('/api/shifts/7/swap-requests').reply(200);
        mock.onPost('/api/swap-requests/3/approve').reply((config) => {
            approveBody = JSON.parse(config.data);
            return [200];
        });
        mock.onPost('/api/swap-requests/3/cancel').reply(200);

        await expect(createSwapRequest(7)).resolves.toBeUndefined();
        await expect(approveSwapRequest(3, 42)).resolves.toBeUndefined();
        await expect(cancelSwapRequest(3)).resolves.toBeUndefined();
        expect(approveBody).toEqual({employeeId: 42});
    });

    it('fetchOpenSwaps 는 OPEN 만 조회하고 ApiResponse 래핑도 평탄화한다', async () => {
        let captured: any = null;
        mock.onGet('/api/stores/10/swap-requests').replyOnce((config) => {
            captured = config;
            return [200, {data: [{id: 9}]}];
        });

        await expect(fetchOpenSwaps(10)).resolves.toEqual([{id: 9}]);
        expect(captured.params).toEqual({status: 'OPEN'});
    });

    it('applySwap 은 지원 엔드포인트로 POST 한다', async () => {
        mock.onPost('/api/swap-requests/9/apply').reply(200);
        await expect(applySwap(9)).resolves.toBeUndefined();
    });
});
