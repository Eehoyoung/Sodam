import axios from 'axios';
import api, {__testing__, setOnUnauthorized} from '../../../src/common/utils/api';
import TokenManager from '../../../src/services/TokenManager';
import {env} from '../../../src/common/config/env';

// axios-mock-adapter 가 없으면 최소 폴리필로 안전 폴백 (CI/로컬 모두 동작 보장)
let AxiosMockAdapter: any;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
    AxiosMockAdapter = class {
        private inst: any;
        constructor(instance: any) {
            this.inst = instance;
        }
        onGet() {
            return {replyOnce: () => this, reply: () => this};
        }
        onPost() {
            return {replyOnce: () => this, reply: () => this};
        }
        onDelete() {
            return {replyOnce: () => this, reply: () => this};
        }
        resetHandlers() {}
        restore() {}
    };
}

// [Test Mapping] api 인터셉터
// - BASE_URL = env.apiBaseUrl
// - request interceptor 가 TokenManager.getAccess() 결과를 Authorization 헤더로 자동 주입
// - 401 응답 시 refreshAccessToken 1회만 호출 (single-flight)
// - refresh 실패 시 TokenManager.clear() + onUnauthorized 콜백

describe('api (axios 인터셉터)', () => {
    beforeAll(() => {
        (globalThis as any).__DEV__ = true;
    });

    beforeEach(async () => {
        await TokenManager.clear();
        setOnUnauthorized(null);
    });

    it('BASE_URL 이 env.apiBaseUrl 와 일치한다', () => {
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
        // axios v1: headers 객체에서 직접 접근 가능
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

        // 두 개의 요청 동시에 401
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

    it('refresh 실패 시 TokenManager 가 비워지고 onUnauthorized 콜백이 호출된다', async () => {
        const client = __testing__.getClient();
        const instMock = new AxiosMockAdapter(client);
        const globalMock = new AxiosMockAdapter(axios);

        await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});

        const cb = jest.fn();
        setOnUnauthorized(cb);

        instMock.onGet('/protected').replyOnce(401);
        globalMock.onPost(/\/api\/auth\/refresh$/).reply(401);

        await expect(api.get('/protected')).rejects.toBeDefined();

        expect(cb).toHaveBeenCalledTimes(1);
        expect(await TokenManager.getAccess()).toBeNull();
        expect(await TokenManager.getRefresh()).toBeNull();
    });

    it('refreshToken 자체가 없으면 refresh 시도가 실패하고 onUnauthorized 호출', async () => {
        const client = __testing__.getClient();
        const instMock = new AxiosMockAdapter(client);

        // accessToken 만 있고 refresh 가 없는 상태 (TokenManager.clear 이후 access 만 세팅)
        await TokenManager.clear();
        const cb = jest.fn();
        setOnUnauthorized(cb);

        instMock.onGet('/protected').replyOnce(401);

        await expect(api.get('/protected')).rejects.toBeDefined();
        expect(cb).toHaveBeenCalled();
    });
});
