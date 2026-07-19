import axios from 'axios';
import {refresh, subscribeSessionExpired} from '../../../src/common/auth/sessionCoordinator';
import {emitSessionExpired, __testing__ as eventsTesting} from '../../../src/common/auth/events';
import TokenManager from '../../../src/services/TokenManager';

let AxiosMockAdapter: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AxiosMockAdapter = require('axios-mock-adapter');
} catch (_) {
  AxiosMockAdapter = class {
    constructor(_instance: any) {}
    onPost() { return {replyOnce: () => this, reply: () => this}; }
    restore() {}
  };
}

describe('sessionCoordinator.refresh — WP-02: client.ts에서 이동한 구현', () => {
  let globalMock: any;

  beforeEach(async () => {
    await TokenManager.clear();
    globalMock = new AxiosMockAdapter(axios);
  });

  afterEach(() => {
    globalMock.restore();
    eventsTesting.reset();
  });

  test('refresh token 이 없으면 NO_REFRESH_TOKEN 을 던진다', async () => {
    await expect(refresh()).rejects.toThrow('NO_REFRESH_TOKEN');
  });

  test('1차 경로(/api/auth/refresh) 성공 시 새 토큰을 저장하고 accessToken을 반환한다', async () => {
    await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(200, {accessToken: 'new-access', refreshToken: 'new-refresh'});

    const result = await refresh();

    expect(result).toBe('new-access');
    expect(await TokenManager.getAccess()).toBe('new-access');
    expect(await TokenManager.getRefresh()).toBe('new-refresh');
  });

  test('1차 경로가 404/405 면 폴백 경로(/api/refresh)로 재시도한다', async () => {
    await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(404);
    globalMock.onPost(/\/api\/refresh$/).replyOnce(200, {accessToken: 'fallback-access', refreshToken: 'fallback-refresh'});

    const result = await refresh();

    expect(result).toBe('fallback-access');
  });

  test('응답에 refreshToken이 없으면 기존 refreshToken을 그대로 유지한다(로테이션 미발생 시)', async () => {
    await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(200, {accessToken: 'new-access'});

    await refresh();

    expect(await TokenManager.getRefresh()).toBe('r1');
  });

  test('응답에 accessToken이 없으면 INVALID_REFRESH_RESPONSE를 던진다', async () => {
    await TokenManager.setTokens({accessToken: 'old', refreshToken: 'r1'});
    globalMock.onPost(/\/api\/auth\/refresh$/).replyOnce(200, {});

    await expect(refresh()).rejects.toThrow('INVALID_REFRESH_RESPONSE');
  });
});

describe('sessionCoordinator.subscribeSessionExpired — WP-02: events.ts 재-export', () => {
  afterEach(() => eventsTesting.reset());

  test('구독하면 리스너가 등록되고, 해제 함수 호출 시 제거된다', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSessionExpired(listener);

    expect(eventsTesting.listenerCount()).toBe(1);
    unsubscribe();
    expect(eventsTesting.listenerCount()).toBe(0);
  });

  test('emitSessionExpired는 등록된 모든 리스너를 호출한다(해제된 리스너는 제외)', () => {
    const a = jest.fn();
    const b = jest.fn();
    const unsubscribeA = subscribeSessionExpired(a);
    subscribeSessionExpired(b);
    unsubscribeA();

    emitSessionExpired();

    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});
