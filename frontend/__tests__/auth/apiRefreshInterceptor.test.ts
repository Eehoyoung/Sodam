import axios from 'axios';
import api, { __testing__ } from '../../src/common/utils/api';
import TokenManager from '../../src/services/TokenManager';

// Note: This test uses axios-mock-adapter. Install dev dep if running locally:
// npm i -D axios-mock-adapter
let AxiosMockAdapter: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AxiosMockAdapter = require('axios-mock-adapter');
} catch (e) {
  // Fallback minimal mock to avoid runtime errors if dependency missing in this session
  AxiosMockAdapter = class {
    constructor(private instance: any) {}
    private handlers: Record<string, any[]> = {};
    onGet(url: string | RegExp) { return this.add('get', url); }
    onPost(url: string | RegExp) { return this.add('post', url); }
    replyOnce() { return { reply: () => {} }; }
    reply() { return { }; }
    private add(method: string, _url: any) { return { replyOnce: () => this, reply: () => this }; }
    resetHandlers() {}
    restore() {}
  };
}

describe('api refresh interceptor', () => {
  beforeEach(async () => {
    await TokenManager.clear();
  });

  test('refreshes token on 401 and retries original request', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onGet('/protected').replyOnce(401);
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(200, { accessToken: 'newA', refreshToken: 'ref2' });
    instMock.onGet('/protected').reply(200, { ok: true });

    const res = await api.get('/protected');
    expect(res.status).toBe(200);
  });

  test('fails when refresh fails and clears tokens', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onGet('/protected').replyOnce(401);
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(401);

    await expect(api.get('/protected')).rejects.toBeDefined();

    const a = await TokenManager.getAccess();
    const r = await TokenManager.getRefresh();
    expect(a).toBeNull();
    expect(r).toBeNull();
  });

  test('queues concurrent 401 requests and performs single refresh', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onGet('/protected').replyOnce(401);
    instMock.onGet('/protected2').replyOnce(401);

    let refreshCalls = 0;
    globalMock.onPost(/\/api\/auth\/refresh$/).reply(() => {
      refreshCalls += 1;
      return [200, { accessToken: 'newA', refreshToken: 'ref2' }];
    });

    instMock.onGet('/protected').reply(200, { ok: true });
    instMock.onGet('/protected2').reply(200, { ok: true });

    const [r1, r2] = await Promise.all([
      api.get('/protected'),
      api.get('/protected2'),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refreshCalls).toBe(1);
  });

  test('refresh 자체가 실패하면 큐에 쌓인 나머지 동시 요청도 refresh는 다시 시도하지 않고 함께 실패한다 (session-expired 1회)', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onGet('/protected').replyOnce(401);
    instMock.onGet('/protected2').replyOnce(401);

    let refreshCalls = 0;
    globalMock.onPost(/\/api\/auth\/refresh$/).reply(() => {
      refreshCalls += 1;
      return [401];
    });

    const results = await Promise.allSettled([
      api.get('/protected'),
      api.get('/protected2'),
    ]);

    expect(results[0].status).toBe('rejected');
    expect(results[1].status).toBe('rejected');
    // refresh 실패도 single-flight — 큐에 쌓인 요청 수만큼 재시도하지 않는다.
    expect(refreshCalls).toBe(1);

    const a = await TokenManager.getAccess();
    const r = await TokenManager.getRefresh();
    expect(a).toBeNull();
    expect(r).toBeNull();
  });

  // WP-00 실패 재현: AUTH_ENDPOINTS(common/utils/api.ts) 는 '/api/login','/api/auth/refresh',
  // '/api/refresh','/api/join','/api/kakao' 만 refresh-제외로 등록돼 있다. 그런데 계획서 §7.3.3-A는
  // "로그인·Apple·Kakao·회원가입·비밀번호 재설정의 401은 자격증명 오류이므로 자동 refresh를 호출하지
  // 않는다"고 규정한다. 실제 FE 호출 경로(authService.ts)는 '/apple/auth/proc'(아예 목록에 없음)와
  // '/kakao/auth/proc'('/api/kakao' 문자열을 포함하지 않아 isAuthEndpoint 매칭 실패)이므로 현재는
  // 두 경로 모두 401에 refresh를 시도한다. 아래 두 테스트는 "현재(버그가 있는) 동작"을 고정한다 —
  // WP-02(세션 코디네이터 이관)에서 refresh 제외 목록에 두 경로를 추가하면 이 테스트는 실패로 뒤집혀야
  // 하며, 그때 expect(refreshAttempted).toBe(true) 를 false 로 갱신한다.
  test('[WP-02 대상] Apple 로그인 401 — 자격증명 오류인데도 refresh를 시도한다(현재 동작 고정)', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onPost('/apple/auth/proc').replyOnce(401, { message: 'invalid identity token' });

    let refreshAttempted = false;
    globalMock.onPost(/\/api\/auth\/refresh$/).reply(() => {
      refreshAttempted = true;
      return [401];
    });

    await expect(client.post('/apple/auth/proc', {})).rejects.toBeDefined();

    expect(refreshAttempted).toBe(true);
  });

  test('[WP-02 대상] Kakao 로그인 401 — isAuthEndpoint 문자열 매칭이 실제 경로(/kakao/auth/proc)와 어긋나 refresh를 시도한다(현재 동작 고정)', async () => {
    const client = __testing__.getClient();
    const instMock = new AxiosMockAdapter(client);
    const globalMock = new AxiosMockAdapter(axios);

    await TokenManager.setTokens({ accessToken: 'oldA', refreshToken: 'ref1' });

    instMock.onGet(/\/kakao\/auth\/proc/).replyOnce(401);

    let refreshAttempted = false;
    globalMock.onPost(/\/api\/auth\/refresh$/).reply(() => {
      refreshAttempted = true;
      return [401];
    });

    await expect(client.get('/kakao/auth/proc?code=abc')).rejects.toBeDefined();

    expect(refreshAttempted).toBe(true);
  });
});
