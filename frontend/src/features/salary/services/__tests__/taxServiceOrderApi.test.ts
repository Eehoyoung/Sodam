import api from '../../../../common/api/client';
import taxServiceOrderApi from '../taxServiceOrderApi';

jest.mock('../../../../common/api/client', () => ({__esModule: true, default: {get: jest.fn(), post: jest.fn()}}));

const mockedGet = api.get as jest.Mock;
const mockedPost = api.post as jest.Mock;
const order = {id: 1, orderId: 'TAX_1_abc', packageType: 'INCOME_TAX_FILING' as const, orderName: '종합소득세 신고 대행', amount: 99000, status: 'PENDING' as const, paidAt: null};

describe('taxServiceOrderApi', () => {
    afterEach(() => jest.clearAllMocks());

    it('패키지와 내 신청 목록을 각각 조회한다', async () => {
        mockedGet.mockResolvedValueOnce({data: [{name: 'INCOME_TAX_FILING', displayName: '종합소득세 신고 대행', amount: 99000}]}).mockResolvedValueOnce({data: [order]});
        await expect(taxServiceOrderApi.getPackages()).resolves.toHaveLength(1);
        await expect(taxServiceOrderApi.getMyOrders()).resolves.toEqual([order]);
        expect(mockedGet).toHaveBeenNthCalledWith(1, '/api/billing/tax-orders/packages');
        expect(mockedGet).toHaveBeenNthCalledWith(2, '/api/billing/tax-orders/me');
    });

    it('인증된 서버 결제 readiness를 조회한다', async () => {
        mockedGet.mockResolvedValueOnce({
            data: {mode: 'LIVE', successUrl: 'https://payments.sodam.example/tax/success', failUrl: 'https://payments.sodam.example/tax/fail'},
        });

        await expect(taxServiceOrderApi.getPaymentReadiness()).resolves.toMatchObject({mode: 'LIVE'});
        expect(mockedGet).toHaveBeenCalledWith('/api/billing/tax-orders/payment-readiness');
    });

    it('선택한 패키지로 주문을 만들고 서버 주문 금액으로 모의 결제를 확인한다', async () => {
        mockedPost.mockResolvedValueOnce({data: order}).mockResolvedValueOnce({data: {...order, status: 'PAID', paidAt: '2026-08-10T10:00:00'}});
        const created = await taxServiceOrderApi.createOrder('INCOME_TAX_FILING');
        const confirmed = await taxServiceOrderApi.confirmOrder(created.orderId, `mock_tax_${created.orderId}`, created.amount);
        expect(mockedPost).toHaveBeenNthCalledWith(1, '/api/billing/tax-orders', null, {params: {packageType: 'INCOME_TAX_FILING'}});
        expect(mockedPost).toHaveBeenNthCalledWith(2, '/api/billing/tax-orders/TAX_1_abc/confirm', {paymentKey: 'mock_tax_TAX_1_abc', amount: 99000});
        expect(confirmed.status).toBe('PAID');
    });
});
