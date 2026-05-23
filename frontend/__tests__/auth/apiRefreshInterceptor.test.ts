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
});
