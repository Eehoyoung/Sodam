// tokenStore — AsyncStorage-backed token storage using unifiedStorage (WP-02).
// `services/TokenManager.ts`에 있던 구현을 그대로 옮겼다 — 메서드 시그니처는 바꾸지 않는다
// (기존 250여 개 호출부·테스트의 jest.mock('services/TokenManager', ...) 호환을 위해
// services/TokenManager.ts는 이 파일을 재-export하는 호환 shim으로 남는다).

import {unifiedStorage} from '../utils/unifiedStorage';
import type {AuthTokens} from './types';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export type Tokens = AuthTokens;

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

export const tokenStore = {
  async setAccess(token: string): Promise<void> {
    memoryAccess = token;
    await unifiedStorage.setItem(ACCESS_KEY, token);
  },

  async getAccess(): Promise<string | null> {
    if (memoryAccess) {return memoryAccess;}
    const t = await unifiedStorage.getItem(ACCESS_KEY);
    memoryAccess = t;
    return t;
  },

  async setRefresh(token: string): Promise<void> {
    memoryRefresh = token;
    await unifiedStorage.setItem(REFRESH_KEY, token);
  },

  async getRefresh(): Promise<string | null> {
    if (memoryRefresh) {return memoryRefresh;}
    const t = await unifiedStorage.getItem(REFRESH_KEY);
    memoryRefresh = t;
    return t;
  },

  async setTokens(tokens: Tokens): Promise<void> {
    await Promise.all([
      unifiedStorage.setItem(ACCESS_KEY, tokens.accessToken),
      unifiedStorage.setItem(REFRESH_KEY, tokens.refreshToken),
    ]);
    memoryAccess = tokens.accessToken;
    memoryRefresh = tokens.refreshToken;
  },

  async getTokens(): Promise<Tokens | null> {
    const [a, r] = await Promise.all([
      this.getAccess(),
      this.getRefresh(),
    ]);
    if (!a || !r) {return null;}
    return { accessToken: a, refreshToken: r } as Tokens;
  },

  async clear(): Promise<void> {
    await Promise.all([
      unifiedStorage.removeItem(ACCESS_KEY),
      unifiedStorage.removeItem(REFRESH_KEY),
    ]);
    memoryAccess = null;
    memoryRefresh = null;
  },
};

export default tokenStore;
