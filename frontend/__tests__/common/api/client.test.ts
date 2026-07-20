import axios from 'axios';
import api, {__testing__, setOnPlanRequired, PlanRequiredInfo} from '../../../src/common/api/client';
import {api as apiViaIndex, __testing__ as __testingViaIndex__} from '../../../src/common/api';
import {subscribeSessionExpired} from '../../../src/common/auth/sessionCoordinator';
import TokenManager from '../../../src/common/auth/tokenStore';
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

// [Test Mapping] common/api/client.ts — 인터셉터(Authorization 주입, 401 단일 refresh,
// 402 페이월) 회귀 테스트. WP-10에서 구 경로 호환 shim(common/utils/api.ts) 삭제와 함께
// api.test.ts(구 경로)의 세부 401/402 동작 검증을 이 파일로 병합했다.
describe('common/api/client', () => {
    beforeEach(async () => {
        await TokenManager.clear();
        setOnPlanRequired(null);
    });

    it('client.ts와 index.ts 배럴이 같은 axios 인스턴스/객체를 참조한다(단일 진실)', () => {
        expect(__testingViaIndex__.getClient()).toBe(__testing__.getClient());
        expect(apiViaIndex).toBe(api);
    });

    it('BASE_URL 이 env.apiBaseUrl 과 일치한다', () => {
        const client = __testing__.getClient();
        expect(client.defaults.baseURL).toBe(env.apiBaseUrl);
    });

    it('Authorization: Bearer <token> 을 자동 주입한다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        await TokenManager.setTokens({accessToken: 'access_xyz', refreshToken: 'ref_1'});

        let captured: any = null;
        mock.onGet('/echo').reply((config: any) => {
            captured = config;
            return [200, {ok: true}];
        });

        const res = await api.get('/echo');
        expect(res.status).toBe(200);
        const authHeader =
            captured?.headers?.Authorization ??
            captured?.headers?.get?.('Authorization');
        expect(authHeader).toBe('Bearer access_xyz');
    });

    it('401 응답 시 refresh 1회만 호출되고 원 요청을 재시도한다 (single-flight)', async () => {
        const client = __testing__.getClient();
        const instMock = new AxiosMockAdapter(client);
        const globalMock = new AxiosMockAdapter(axios);

        await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});

        instMock.onGet('/a').replyOnce(401);
        instMock.onGet('/b').replyOnce(401);

        let refreshCalls = 0;
        globalMock.onPost(/\/api\/auth\/refresh$/).reply(() => {
            refreshCalls += 1;
            return [200, {accessToken: 'new', refreshToken: 'r2'}];
        });

        instMock.onGet('/a').reply(200, {ok: 'a'});
        instMock.onGet('/b').reply(200, {ok: 'b'});

        const [ra, rb] = await Promise.all([api.get('/a'), api.get('/b')]);
        expect(ra.status).toBe(200);
        expect(rb.status).toBe(200);
        expect(refreshCalls).toBe(1);
    });

    it('refresh 실패 시 TokenManager 가 비워지고 subscribeSessionExpired 구독자가 호출된다', async () => {
        const client = __testing__.getClient();
        const instMock = new AxiosMockAdapter(client);
        const globalMock = new AxiosMockAdapter(axios);

        await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});

        const cb = jest.fn();
        const unsubscribe = subscribeSessionExpired(cb);

        instMock.onGet('/protected').replyOnce(401);
        globalMock.onPost(/\/api\/auth\/refresh$/).reply(401);

        await expect(api.get('/protected')).rejects.toBeDefined();

        expect(cb).toHaveBeenCalledTimes(1);
        expect(await TokenManager.getAccess()).toBeNull();
        expect(await TokenManager.getRefresh()).toBeNull();

        unsubscribe();
    });

    it('refreshToken 자체가 없으면 refresh 시도가 실패하고 subscribeSessionExpired 구독자가 호출된다', async () => {
        const client = __testing__.getClient();
        const instMock = new AxiosMockAdapter(client);

        await TokenManager.clear();
        const cb = jest.fn();
        const unsubscribe = subscribeSessionExpired(cb);

        instMock.onGet('/protected').replyOnce(401);

        await expect(api.get('/protected')).rejects.toBeDefined();
        expect(cb).toHaveBeenCalled();

        unsubscribe();
    });

    // [Test Mapping] WP-00 계약 기준선 — CLAUDE.md/frontend.md 가 경고하는 이중 래핑 함정.
    // api.get(url, params, config) 의 2번째 인자는 "params 객체 그 자체"다. raw axios 습관대로
    // {params: {...}} 형태를 2번째 인자로 넘기면 실제 querystring 이 `?params[foo]=bar` 로 깨진다.
    describe('api.get params 이중 래핑 방지 계약', () => {
        it('올바른 사용: 2번째 인자를 params 객체 그대로 넘기면 그대로 querystring 이 된다', async () => {
            const client = __testing__.getClient();
            const mock = new AxiosMockAdapter(client);
            let captured: any = null;
            mock.onGet('/search').reply((config: any) => {
                captured = config.params;
                return [200, {ok: true}];
            });

            await api.get('/search', {keyword: 'foo'});

            expect(captured).toEqual({keyword: 'foo'});
        });

        it('[회귀 방지] {params:{...}} 를 2번째 인자로 잘못 넘기면 이중 래핑되어 원래 쿼리가 사라진다', async () => {
            const client = __testing__.getClient();
            const mock = new AxiosMockAdapter(client);
            let captured: any = null;
            mock.onGet('/search').reply((config: any) => {
                captured = config.params;
                return [200, {ok: true}];
            });

            await api.get('/search', {params: {keyword: 'foo'}} as any);

            expect(captured).not.toEqual({keyword: 'foo'});
            expect(captured).toEqual({params: {keyword: 'foo'}});
        });
    });

    // [Test Mapping] 402 PLAN_REQUIRED — 페이월 계약. BE는 ApiResponse.errorCode 로 내려주고,
    // FE 는 onPlanRequired 콜백을 호출한 뒤에도 원본 에러는 그대로 reject 한다(호출부가 이어서
    // catch 로 분기할 수 있도록 흐름을 끊지 않음).
    describe('402 PLAN_REQUIRED 페이월 계약', () => {
        afterEach(() => setOnPlanRequired(null));

        it('errorCode=PLAN_REQUIRED 이면 onPlanRequired 콜백에 requiredPlan/currentPlan/message 를 전달하고, 원본 promise 는 reject 된다', async () => {
            const client = __testing__.getClient();
            const mock = new AxiosMockAdapter(client);

            const received: PlanRequiredInfo[] = [];
            setOnPlanRequired((info) => received.push(info));

            mock.onPost('/premium-action').reply(402, {
                success: false,
                errorCode: 'PLAN_REQUIRED',
                message: '프리미엄 플랜이 필요해요.',
                data: {requiredPlan: 'PREMIUM', currentPlan: 'FREE'},
            });

            await expect(api.post('/premium-action')).rejects.toBeDefined();

            expect(received).toHaveLength(1);
            expect(received[0]).toEqual({
                requiredPlan: 'PREMIUM',
                currentPlan: 'FREE',
                message: '프리미엄 플랜이 필요해요.',
            });
        });

        it('402 여도 errorCode 가 PLAN_REQUIRED 가 아니면 onPlanRequired 를 호출하지 않는다', async () => {
            const client = __testing__.getClient();
            const mock = new AxiosMockAdapter(client);

            const cb = jest.fn();
            setOnPlanRequired(cb);

            mock.onPost('/other-402').reply(402, {success: false, errorCode: 'SOME_OTHER_CODE'});

            await expect(api.post('/other-402')).rejects.toBeDefined();

            expect(cb).not.toHaveBeenCalled();
        });
    });
});
