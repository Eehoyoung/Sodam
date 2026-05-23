// TokenManager — AsyncStorage-backed token storage using unifiedStorage
// Provides a stable interface that can be swapped to EncryptedStorage later

import { unifiedStorage } from '../common/utils/unifiedStorage';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export type Tokens = { accessToken: string; refreshToken: string };

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;

export const TokenManager = {
  async setAccess(token: string): Promise<void> {
    memoryAccess = token;
    await unifiedStorage.setItem(ACCESS_KEY, token);
  },

  async getAccess(): Promise<string | null> {
    if (memoryAccess) return memoryAccess;
    const t = await unifiedStorage.getItem(ACCESS_KEY);
    memoryAccess = t;
    return t;
  },

  async setRefresh(token: string): Promise<void> {
    memoryRefresh = token;
    await unifiedStorage.setItem(REFRESH_KEY, token);
  },

  async getRefresh(): Promise<string | null> {
    if (memoryRefresh) return memoryRefresh;
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
    if (!a || !r) return null;
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

export default TokenManager;
