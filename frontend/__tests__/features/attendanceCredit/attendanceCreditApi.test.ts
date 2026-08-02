import attendanceCreditApi from '../../../src/features/attendanceCredit/services/attendanceCreditApi';
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

// [Test Mapping] AttendanceCredit charge APIs (출근권 충전소 IAP)
// - GET  /api/attendance-credits/charge/packs
// - POST /api/attendance-credits/charge/orders            (query: packCode)
// - POST /api/attendance-credits/charge/orders/{id}/confirm {paymentKey, amount}
// - GET  /api/attendance-credits/charge/orders/me
// 잔액 요약(GET /api/attendance-credits/me)은 features/recruitment/services/attendanceCreditService.ts
// 가 이미 소유·테스트하므로 여기서 중복 검증하지 않는다.

describe('attendanceCreditApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getChargeCatalog', () => {
        it('카탈로그(상품+첫구매 보너스 가용여부)를 그대로 반환한다', async () => {
            const payload = {
                packs: [{code: 'SMALL', displayName: '스몰 팩', creditQuantity: 10, ticketQuantity: 0, priceKrw: 1900, popular: false}],
                firstPurchaseBonusAvailable: true,
                firstPurchaseBonusMultiplier: 2,
                promoCopyEnabled: false,
            };
            (api.get as jest.Mock).mockResolvedValue({data: payload});

            const r = await attendanceCreditApi.getChargeCatalog();

            expect(api.get).toHaveBeenCalledWith('/api/attendance-credits/charge/packs');
            expect(r).toEqual(payload);
        });
    });

    describe('createChargeOrder', () => {
        it('packCode 를 쿼리 파라미터로 POST 한다(이중래핑 없이 params 로 직접 전달)', async () => {
            const resp = {
                id: 1, orderId: 'ACC_1_abc', packCode: 'MEDIUM', orderName: '미디엄 팩',
                amountKrw: 7900, creditQuantity: 50, bonusCreditQuantity: 0, ticketQuantity: 0,
                status: 'PENDING', paidAt: null,
            };
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await attendanceCreditApi.createChargeOrder('MEDIUM');

            expect(api.post).toHaveBeenCalledWith(
                '/api/attendance-credits/charge/orders',
                null,
                {params: {packCode: 'MEDIUM'}},
            );
            expect(r).toEqual(resp);
        });
    });

    describe('confirmCharge', () => {
        it('orderId 를 경로에, paymentKey/amount 를 body 로 POST 한다', async () => {
            const resp = {
                id: 1, orderId: 'ACC_1_abc', packCode: 'SMALL', orderName: '스몰 팩',
                amountKrw: 1900, creditQuantity: 10, bonusCreditQuantity: 10, ticketQuantity: 0,
                status: 'PAID', paidAt: '2026-08-02T10:00:00',
            };
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await attendanceCreditApi.confirmCharge('ACC_1_abc', 'PK_1', 1900);

            expect(api.post).toHaveBeenCalledWith(
                '/api/attendance-credits/charge/orders/ACC_1_abc/confirm',
                {paymentKey: 'PK_1', amount: 1900},
            );
            expect(r).toEqual(resp);
        });

        it('orderId 에 특수문자가 있어도 URL 인코딩한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {}});
            await attendanceCreditApi.confirmCharge('ACC_1_a b', 'PK', 100);
            expect(api.post).toHaveBeenCalledWith(
                '/api/attendance-credits/charge/orders/ACC_1_a%20b/confirm',
                {paymentKey: 'PK', amount: 100},
            );
        });
    });

    describe('myChargeOrders', () => {
        it('내 충전 주문 목록을 그대로 반환한다', async () => {
            const payload = [{id: 1, orderId: 'ACC_1', packCode: 'SMALL', orderName: '스몰 팩', amountKrw: 1900, creditQuantity: 10, bonusCreditQuantity: 0, ticketQuantity: 0, status: 'PAID', paidAt: null}];
            (api.get as jest.Mock).mockResolvedValue({data: payload});

            const r = await attendanceCreditApi.myChargeOrders();

            expect(api.get).toHaveBeenCalledWith('/api/attendance-credits/charge/orders/me');
            expect(r).toEqual(payload);
        });
    });
});
