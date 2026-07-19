import api, {__testing__, setOnUnauthorized, setOnPlanRequired, PlanRequiredInfo} from '../../../src/common/api/client';
import {api as apiViaIndex, __testing__ as __testingViaIndex__} from '../../../src/common/api';
import apiViaCompat, {__testing__ as __testingViaCompat__} from '../../../src/common/utils/api';
import TokenManager from '../../../src/services/TokenManager';
import {env} from '../../../src/common/config/env';

let AxiosMockAdapter: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
    AxiosMockAdapter = class {
        constructor(_instance: any) {}
        onGet() { return {replyOnce: () => this, reply: () => this}; }
        onPost() { return {replyOnce: () => this, reply: () => this}; }
        resetHandlers() {}
        restore() {}
    };
}

// [Test Mapping] WP-01 — 구현이 common/api/client.ts로 이동한 뒤에도:
// 1) 새 경로(client 직접 import, index 배럴)와 2) 구 경로(common/utils/api 호환 shim) 가
// 전부 "동일한 axios 인스턴스"를 가리켜야 한다(단일 진실). 세부 401/402 동작 회귀 테스트는
// common/utils/api.test.ts(구 경로)에 이미 있으므로 여기서는 중복 검증하지 않는다.
describe('common/api/client — WP-01 이관 후 단일 진실 확인', () => {
    beforeEach(async () => {
        await TokenManager.clear();
        setOnUnauthorized(null);
        setOnPlanRequired(null);
    });

    it('client.ts, index.ts 배럴, 구 utils/api.ts 호환 shim이 전부 같은 axios 인스턴스를 참조한다', () => {
        const directClient = __testing__.getClient();
        expect(__testingViaIndex__.getClient()).toBe(directClient);
        expect(__testingViaCompat__.getClient()).toBe(directClient);
    });

    it('client.ts, index.ts, 구 shim의 api 객체는 동일한 참조다(default export)', () => {
        expect(apiViaIndex).toBe(api);
        expect(apiViaCompat).toBe(api);
    });

    it('BASE_URL 은 env.apiBaseUrl 과 일치한다(client.ts가 유일한 axios.create 지점)', () => {
        expect(__testing__.getClient().defaults.baseURL).toBe(env.apiBaseUrl);
    });

    it('새 경로로 요청해도 Authorization 자동 주입이 그대로 동작한다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        await TokenManager.setTokens({accessToken: 'new-path-token', refreshToken: 'r1'});

        let captured: any = null;
        mock.onGet('/echo').reply((config: any) => {
            captured = config;
            return [200, {ok: true}];
        });

        const res = await api.get('/echo');
        expect(res.status).toBe(200);
        const authHeader = captured?.headers?.Authorization ?? captured?.headers?.get?.('Authorization');
        expect(authHeader).toBe('Bearer new-path-token');
    });

    it('402 PLAN_REQUIRED 콜백도 새 경로 import로 정상 등록/호출된다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        const received: PlanRequiredInfo[] = [];
        setOnPlanRequired((info) => received.push(info));

        mock.onPost('/premium').reply(402, {
            success: false,
            errorCode: 'PLAN_REQUIRED',
            message: '프리미엄 플랜이 필요해요.',
            data: {requiredPlan: 'PREMIUM', currentPlan: 'FREE'},
        });

        await expect(api.post('/premium')).rejects.toBeDefined();
        expect(received).toEqual([{requiredPlan: 'PREMIUM', currentPlan: 'FREE', message: '프리미엄 플랜이 필요해요.'}]);
    });
});
