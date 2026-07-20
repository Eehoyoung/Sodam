import subscriptionApi from '../../../src/features/subscription/services/subscriptionApi';
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

// [Test Mapping] Subscription APIs (토스 결제 빌링키 흐름)
// - GET    /api/billing/plans
// - GET    /api/billing/me           (204/404 → null)
// - POST   /api/billing/subscribe/free
// - POST   /api/billing/subscribe    {plan, authKey, billingCycle}
// - POST   /api/billing/pause
// - POST   /api/billing/resume
// - DELETE /api/billing/cancel

describe('subscriptionApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPlans', () => {
        it('PlanCatalogItem 배열로 매핑한다', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: [
                    {name: 'FREE', displayName: '무료', monthlyPriceKrw: 0, description: '체험', paid: false, employeeLimit: 2, features: []},
                    {name: 'PRO', displayName: '프로', monthlyPriceKrw: 19900, description: '권장', paid: true, employeeLimit: null, features: ['연차']},
                ],
            });

            const plans = await subscriptionApi.getPlans();

            expect(api.get).toHaveBeenCalledWith('/api/billing/plans');
            expect(plans).toHaveLength(2);
            expect(plans[0]).toEqual({
                name: 'FREE',
                displayName: '무료',
                monthlyPriceKrw: 0,
                description: '체험',
                employeeLimit: 2,
                features: [],
            });
            expect(plans[1].name).toBe('PRO');
            expect(plans[1].employeeLimit).toBeNull();
            expect(plans[1].features).toEqual(['연차']);
        });

        it('응답 data 가 null 이면 빈 배열을 반환한다', async () => {
            (api.get as jest.Mock).mockResolvedValue({data: null});
            const plans = await subscriptionApi.getPlans();
            expect(plans).toEqual([]);
        });
    });

    describe('getMyCurrent', () => {
        it('정상 응답을 그대로 반환한다', async () => {
            const payload = {
                id: 1,
                plan: 'PRO',
                status: 'ACTIVE',
                billingCycle: 'YEARLY',
                cardLabel: '신한 1234',
                currentPeriodEndAt: '2026-06-19',
                nextBillingAt: '2026-06-19',
            };
            (api.get as jest.Mock).mockResolvedValue({data: payload});
            const r = await subscriptionApi.getMyCurrent();
            expect(api.get).toHaveBeenCalledWith('/api/billing/me');
            expect(r).toEqual(payload);
        });

        it('204 응답은 null 로 변환한다', async () => {
            const err: any = new Error('No Content');
            err.response = {status: 204};
            (api.get as jest.Mock).mockRejectedValue(err);
            const r = await subscriptionApi.getMyCurrent();
            expect(r).toBeNull();
        });

        it('404 응답은 null 로 변환한다', async () => {
            const err: any = new Error('Not Found');
            err.response = {status: 404};
            (api.get as jest.Mock).mockRejectedValue(err);
            const r = await subscriptionApi.getMyCurrent();
            expect(r).toBeNull();
        });

        it('기타 에러는 그대로 throw 한다', async () => {
            const err: any = new Error('Server');
            err.response = {status: 500};
            (api.get as jest.Mock).mockRejectedValue(err);
            await expect(subscriptionApi.getMyCurrent()).rejects.toBe(err);
        });
    });

    describe('subscribePaid', () => {
        it('plan + authKey + 기본 billingCycle(MONTHLY) 을 body 로 POST 한다', async () => {
            const resp = {id: 10, plan: 'PREMIUM', status: 'ACTIVE'};
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await subscriptionApi.subscribePaid('PREMIUM', 'auth_key_xyz');

            expect(api.post).toHaveBeenCalledWith('/api/billing/subscribe', {
                plan: 'PREMIUM',
                authKey: 'auth_key_xyz',
                billingCycle: 'MONTHLY',
            });
            expect(r).toEqual(resp);
        });

        it('전달된 billingCycle 을 body 에 반영한다', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {id: 11, plan: 'PRO', status: 'PENDING_PAYMENT'}});

            await subscriptionApi.subscribePaid('PRO', 'auth_key_abc', 'HALF_YEARLY');

            expect(api.post).toHaveBeenCalledWith('/api/billing/subscribe', {
                plan: 'PRO',
                authKey: 'auth_key_abc',
                billingCycle: 'HALF_YEARLY',
            });
        });
    });

    describe('pause', () => {
        it('POST /api/billing/pause 후 ACTIVE→PAUSED 응답을 반환한다', async () => {
            const resp = {id: 1, plan: 'PRO', status: 'PAUSED'};
            (api.post as jest.Mock).mockResolvedValue({data: resp});
            const r = await subscriptionApi.pause();
            expect(api.post).toHaveBeenCalledWith('/api/billing/pause');
            expect(r).toEqual(resp);
        });
    });

    describe('resume', () => {
        it('POST /api/billing/resume 후 PAUSED→ACTIVE 응답을 반환한다', async () => {
            const resp = {id: 1, plan: 'PRO', status: 'ACTIVE'};
            (api.post as jest.Mock).mockResolvedValue({data: resp});
            const r = await subscriptionApi.resume();
            expect(api.post).toHaveBeenCalledWith('/api/billing/resume');
            expect(r).toEqual(resp);
        });
    });

    describe('subscribeFree', () => {
        it('FREE 플랜 가입 엔드포인트를 호출한다', async () => {
            const resp = {id: 11, plan: 'FREE', status: 'ACTIVE'};
            (api.post as jest.Mock).mockResolvedValue({data: resp});

            const r = await subscriptionApi.subscribeFree();
            expect(api.post).toHaveBeenCalledWith('/api/billing/subscribe/free');
            expect(r).toEqual(resp);
        });
    });

    describe('cancel', () => {
        it('DELETE /api/billing/cancel 호출', async () => {
            (api.delete as jest.Mock).mockResolvedValue({data: undefined});
            await subscriptionApi.cancel();
            expect(api.delete).toHaveBeenCalledWith('/api/billing/cancel');
        });
    });
});
