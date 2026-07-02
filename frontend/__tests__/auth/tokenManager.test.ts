import TokenManager from '../../src/services/TokenManager';

describe('TokenManager', () => {
  beforeEach(async () => {
    await TokenManager.clear();
  });

  test('stores and retrieves access and refresh tokens', async () => {
    await TokenManager.setTokens({ accessToken: 'a1', refreshToken: 'r1' });

    const a = await TokenManager.getAccess();
    const r = await TokenManager.getRefresh();
    const both = await TokenManager.getTokens();

    expect(a).toBe('a1');
    expect(r).toBe('r1');
    expect(both).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
  });

  test('setAccess only path persists access token', async () => {
    await TokenManager.setAccess('a2');

    const a = await TokenManager.getAccess();
    const r = await TokenManager.getRefresh();

    expect(a).toBe('a2');
    expect(r).toBeNull();
  });

  test('clear removes tokens from storage and memory cache', async () => {
    await TokenManager.setTokens({ accessToken: 'a3', refreshToken: 'r3' });
    await TokenManager.clear();

    const a = await TokenManager.getAccess();
    const r = await TokenManager.getRefresh();
    const both = await TokenManager.getTokens();

    expect(a).toBeNull();
    expect(r).toBeNull();
    expect(both).toBeNull();
  });
});
