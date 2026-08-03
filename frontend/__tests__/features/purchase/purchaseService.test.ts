/**
 * purchaseService — api.get(url, params) 이중 래핑 함정 회귀 방지.
 * client.ts 의 api.get 은 (url, params, config) => apiClient.get(url, {params, ...config}) 형태라,
 * 서비스가 api.get(url, {params: {...}})처럼 한 번 더 감싸면 쿼리스트링이 나가지 않는다.
 * 여기서는 서비스가 두 번째 인자로 쿼리 객체를 "그대로" 넘기는지 직접 검증한다.
 */
jest.mock('../../../src/common/api/client', () => {
    const get = jest.fn();
    const post = jest.fn();
    const put = jest.fn();
    const del = jest.fn();
    return {
        __esModule: true,
        default: {get, post, put, delete: del},
        api: {get, post, put, delete: del},
    };
});

import api from '../../../src/common/api/client';
import purchaseService from '../../../src/features/purchase/services/purchaseService';
import {PurchaseSaveRequest} from '../../../src/features/purchase/types';

const getMock = api.get as jest.Mock;
const postMock = api.post as jest.Mock;
const putMock = api.put as jest.Mock;
const deleteMock = api.delete as jest.Mock;

describe('purchaseService', () => {
    beforeEach(() => jest.clearAllMocks());

    test('list: from/to 쿼리가 이중 래핑 없이 그대로 전달된다', async () => {
        getMock.mockResolvedValueOnce({data: []});

        await purchaseService.list(1, {from: '2026-08-01', to: '2026-08-31'});

        expect(getMock).toHaveBeenCalledWith('/api/stores/1/purchases', {
            from: '2026-08-01',
            to: '2026-08-31',
        });
    });

    test('priceTrend: item 쿼리가 이중 래핑 없이 전달된다', async () => {
        getMock.mockResolvedValueOnce({data: {itemName: '양파', points: []}});

        await purchaseService.priceTrend(1, '양파');

        expect(getMock).toHaveBeenCalledWith('/api/stores/1/purchases/price-trend', {item: '양파'});
    });

    test('reorder: days 쿼리가 전달된다', async () => {
        getMock.mockResolvedValueOnce({data: []});

        await purchaseService.reorder(1, 30);

        expect(getMock).toHaveBeenCalledWith('/api/stores/1/purchases/reorder', {days: 30});
    });

    test('create: POST 본문을 그대로 전달하고 저장 결과를 반환한다', async () => {
        const body: PurchaseSaveRequest = {
            vendorName: 'OO청과',
            purchaseDate: '2026-08-01',
            category: 'VEGETABLE',
            items: [{itemName: '양파', quantity: 10, unitPrice: 2000}],
        };
        postMock.mockResolvedValueOnce({
            data: {
                id: 1,
                vendorName: 'OO청과',
                purchaseDate: '2026-08-01',
                category: 'VEGETABLE',
                categoryLabel: '야채·청과',
                totalAmount: 20000,
                status: 'CONFIRMED',
                items: [],
            },
        });

        const result = await purchaseService.create(1, body);

        expect(postMock).toHaveBeenCalledWith('/api/stores/1/purchases', body);
        expect(result.id).toBe(1);
        expect(result.totalAmount).toBe(20000);
    });

    test('update: PUT 경로에 purchaseId가 포함된다', async () => {
        const body: PurchaseSaveRequest = {
            vendorName: 'OO청과',
            purchaseDate: '2026-08-01',
            category: 'VEGETABLE',
            items: [{itemName: '대파', quantity: 5, unitPrice: 3000}],
        };
        putMock.mockResolvedValueOnce({data: {id: 9, ...body, categoryLabel: '야채·청과', totalAmount: 15000, status: 'CONFIRMED', items: []}});

        await purchaseService.update(1, 9, body);

        expect(putMock).toHaveBeenCalledWith('/api/stores/1/purchases/9', body);
    });

    test('remove: DELETE 경로에 purchaseId가 포함된다', async () => {
        deleteMock.mockResolvedValueOnce({data: undefined});

        await purchaseService.remove(1, 5);

        expect(deleteMock).toHaveBeenCalledWith('/api/stores/1/purchases/5');
    });
});
