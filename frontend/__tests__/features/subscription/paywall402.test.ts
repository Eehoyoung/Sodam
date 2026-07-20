/**
 * 402 PLAN_REQUIRED 페이월 인터셉터 테스트.
 *
 * BE 가 플랜 부족으로 402 + {code:'PLAN_REQUIRED', data:{requiredPlan,currentPlan}} 를 반환하면
 * setOnPlanRequired 로 등록한 콜백이 호출되고, 원본 에러는 그대로 reject 되어야 한다.
 */
import api, {__testing__, setOnPlanRequired} from '../../../src/common/api/client';
import TokenManager from '../../../src/common/auth/tokenStore';

// axios-mock-adapter 가 없으면 최소 폴리필 (api.test.ts 패턴과 동일)
let AxiosMockAdapter: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
    AxiosMockAdapter = class {
        constructor(_instance: any) {}
        onGet() {
            return {replyOnce: () => this, reply: () => this};
        }
        resetHandlers() {}
        restore() {}
    };
}

describe('api 402 PLAN_REQUIRED 페이월 인터셉터', () => {
    beforeAll(() => {
        (globalThis as any).__DEV__ = true;
    });

    beforeEach(async () => {
        await TokenManager.clear();
        setOnPlanRequired(null);
    });

    it('402 + code=PLAN_REQUIRED 시 콜백을 호출하고 원본 에러를 reject 한다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        const info: {requiredPlan?: string; currentPlan?: string; message?: string}[] = [];
        setOnPlanRequired((i) => info.push(i));

        mock.onGet('/api/billing/gated').replyOnce(402, {
            success: false,
            code: 'PLAN_REQUIRED',
            message: '이 기능은 PRO 플랜부터 이용할 수 있어요.',
            data: {requiredPlan: 'PRO', currentPlan: 'FREE'},
        });

        await expect(api.get('/api/billing/gated')).rejects.toBeDefined();

        expect(info).toHaveLength(1);
        expect(info[0]).toEqual({
            requiredPlan: 'PRO',
            currentPlan: 'FREE',
            message: '이 기능은 PRO 플랜부터 이용할 수 있어요.',
        });
    });

    it('402 라도 code 가 PLAN_REQUIRED 가 아니면 콜백을 호출하지 않는다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        const cb = jest.fn();
        setOnPlanRequired(cb);

        mock.onGet('/api/billing/other').replyOnce(402, {
            success: false,
            code: 'PAYMENT_REQUIRED',
            message: '결제가 필요해요.',
        });

        await expect(api.get('/api/billing/other')).rejects.toBeDefined();
        expect(cb).not.toHaveBeenCalled();
    });

    it('콜백이 등록되지 않아도 402 PLAN_REQUIRED 는 안전하게 reject 된다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        // setOnPlanRequired 미등록 (beforeEach 에서 null)
        mock.onGet('/api/billing/gated2').replyOnce(402, {
            success: false,
            code: 'PLAN_REQUIRED',
            message: '플랜이 필요해요.',
            data: {requiredPlan: 'STARTER', currentPlan: 'FREE'},
        });

        await expect(api.get('/api/billing/gated2')).rejects.toBeDefined();
    });
});
