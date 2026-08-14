import recruitmentBoostPassApi from '../../../src/features/attendanceCredit/services/recruitmentBoostPassApi';
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

// [Test Mapping] RecruitmentBoostPass APIs (채용 부스트 무제한 패스)
// - GET  /api/recruitment-boost-passes/me
// - POST /api/recruitment-boost-passes/orders                  (query: productCode)
// - POST /api/recruitment-boost-passes/orders/{id}/confirm      {paymentKey, amount}
// - GET  /api/recruitment-boost-passes/orders/me

describe('recruitmentBoostPassApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPaymentReadiness', () => {
        it('부스트패스 결제 준비 상태를 조회한다', async () => {
            const payload = {mode: 'MOCK', successUrl: 'sodam://success', failUrl: 'sodam://fail'};
            (api.get as jest.Mock).mockResolvedValue({data: payload});

            await expect(recruitmentBoostPassApi.getPaymentReadiness()).resolves.toEqual(payload);
            expect(api.get).toHaveBeenCalledWith('/api/recruitment-boost-passes/payment-readiness');
        });
    });

    describe('getMe', () => {
        it('활성 상태·상품 목록을 그대로 반환한다', async () => {
            const payload = {
                active: true,
                activeUntil: '2026-08-09T10:00:00',
                remainingDays: 7,
                products: [
                    {code: 'THREE_DAY', displayName: '3일권', durationDays: 3, priceKrw: 9900},
                    {code: 'SEVEN_DAY', displayName: '7일권', durationDays: 7, priceKrw: 17900},
                    {code: 'THIRTY_DAY', displayName: '30일권', durationDays: 30, priceKrw: 49900},
                ],
            };
            (api.get as jest.Mock).mockResolvedValue({data: payload});

            const r = await recruitmentBoostPassApi.getMe();

            expect(api.get).toHaveBeenCalledWith('/api/recruitment-boost-passes/me');
            expect(r).toEqual(payload);
        });
    });

    describe('createOrder', () => {
        it('productCode 를 쿼리 파라미터로 POST 한다(이중래핑 없이 params 로 직접 전달)', async () => {
            const resp = {
                id: 1, orderId: 'RBP_1_abc', productCode: 'SEVEN_DAY', orderName: '채용 부스트 7일권',
                amountKrw: 17900, durationDays: 7, status: 'PENDING', paidAt: null,
            };
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await recruitmentBoostPassApi.createOrder('SEVEN_DAY');

            expect(api.post).toHaveBeenCalledWith(
                '/api/recruitment-boost-passes/orders',
                null,
                {params: {productCode: 'SEVEN_DAY'}},
            );
            expect(r).toEqual(resp);
        });
    });

    describe('confirmOrder', () => {
        it('orderId 를 경로에, paymentKey/amount 를 body 로 POST 한다', async () => {
            const resp = {
                id: 1, orderId: 'RBP_1_abc', productCode: 'THREE_DAY', orderName: '채용 부스트 3일권',
                amountKrw: 9900, durationDays: 3, status: 'PAID', paidAt: '2026-08-02T10:00:00',
            };
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await recruitmentBoostPassApi.confirmOrder('RBP_1_abc', 'PK_1', 9900);

            expect(api.post).toHaveBeenCalledWith(
                '/api/recruitment-boost-passes/orders/RBP_1_abc/confirm',
                {paymentKey: 'PK_1', amount: 9900},
            );
            expect(r).toEqual(resp);
        });

        it('orderId 에 특수문자가 있어도 URL 인코딩한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await recruitmentBoostPassApi.confirmOrder('RBP_1_a b', 'PK', 100);
            expect(api.post).toHaveBeenCalledWith(
                '/api/recruitment-boost-passes/orders/RBP_1_a%20b/confirm',
                {paymentKey: 'PK', amount: 100},
            );
        });
    });

    describe('myOrders', () => {
        it('내 무제한 패스 주문 목록을 그대로 반환한다', async () => {
            const payload = [{
                id: 1, orderId: 'RBP_1', productCode: 'THREE_DAY', orderName: '채용 부스트 3일권',
                amountKrw: 9900, durationDays: 3, status: 'PAID', paidAt: null,
            }];
            (api.get as jest.Mock).mockResolvedValue({data: payload});

            const r = await recruitmentBoostPassApi.myOrders();

            expect(api.get).toHaveBeenCalledWith('/api/recruitment-boost-passes/orders/me');
            expect(r).toEqual(payload);
        });
    });
});
