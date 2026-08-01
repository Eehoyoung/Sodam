// tokenStore — bearer credential은 Android Keystore/iOS Keychain 같은 네이티브 보안 저장소에만 둔다.
// 네이티브 저장소가 없는 개발·테스트 환경에서는 메모리 전용으로 fail closed 한다.

import {unifiedStorage} from '../utils/unifiedStorage';
import {secureTokenStorage} from './secureTokenStorage';
import type {AuthTokens} from './types';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export type Tokens = AuthTokens;

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;
let legacyMigration: Promise<void> | null = null;

async function migrateLegacyAsyncStorageTokens(): Promise<void> {
  if (legacyMigration) {
    return legacyMigration;
  }

  legacyMigration = (async () => {
    // Some isolated renderer tests provide no NativeModules object at all.
    // There can be no usable native AsyncStorage in that environment, so stay memory-only.
    if (!secureTokenStorage.hasNativeModuleRegistry()) {
      return;
    }
    let legacyAccess: string | null = null;
    let legacyRefresh: string | null = null;
    let legacyUserToken: string | null = null;
    try {
      [legacyAccess, legacyRefresh, legacyUserToken] = await Promise.all([
        unifiedStorage.getItem(ACCESS_KEY),
        unifiedStorage.getItem(REFRESH_KEY),
        unifiedStorage.getItem('userToken'),
      ]);

      if (secureTokenStorage.isAvailable()) {
        const legacyAccessToken = legacyAccess ?? legacyUserToken;
        if (legacyAccessToken) {
          await secureTokenStorage.setItem(ACCESS_KEY, legacyAccessToken);
        }
        if (legacyRefresh) {
          await secureTokenStorage.setItem(REFRESH_KEY, legacyRefresh);
        }
      }
    } finally {
      // Keystore/Keychain이 없거나 쓰기에 실패한 경우에도 raw bearer는 남기지 않는다.
      await Promise.all([
        unifiedStorage.removeItem(ACCESS_KEY).catch(() => undefined),
        unifiedStorage.removeItem(REFRESH_KEY).catch(() => undefined),
        unifiedStorage.removeItem('userToken').catch(() => undefined),
      ]);
    }
  })();
  return legacyMigration;
}

export const tokenStore = {
  async setAccess(token: string): Promise<void> {
    await migrateLegacyAsyncStorageTokens();
    memoryAccess = token;
    await secureTokenStorage.setItem(ACCESS_KEY, token);
  },

  async getAccess(): Promise<string | null> {
    if (memoryAccess) {return memoryAccess;}
    await migrateLegacyAsyncStorageTokens();
    const t = await secureTokenStorage.getItem(ACCESS_KEY);
    memoryAccess = t;
    return t;
  },

  async setRefresh(token: string): Promise<void> {
    await migrateLegacyAsyncStorageTokens();
    memoryRefresh = token;
    await secureTokenStorage.setItem(REFRESH_KEY, token);
  },

  async getRefresh(): Promise<string | null> {
    if (memoryRefresh) {return memoryRefresh;}
    await migrateLegacyAsyncStorageTokens();
    const t = await secureTokenStorage.getItem(REFRESH_KEY);
    memoryRefresh = t;
    return t;
  },

  async setTokens(tokens: Tokens): Promise<void> {
    await migrateLegacyAsyncStorageTokens();
    await Promise.all([
      secureTokenStorage.setItem(ACCESS_KEY, tokens.accessToken),
      secureTokenStorage.setItem(REFRESH_KEY, tokens.refreshToken),
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
    const removals: Array<Promise<unknown>> = [
      secureTokenStorage.removeItem(ACCESS_KEY),
      secureTokenStorage.removeItem(REFRESH_KEY),
      secureTokenStorage.removeItem('offlineAttendanceQueue'),
    ];
    if (secureTokenStorage.hasNativeModuleRegistry()) {
      removals.push(
      unifiedStorage.removeItem(ACCESS_KEY).catch(() => undefined),
      unifiedStorage.removeItem(REFRESH_KEY).catch(() => undefined),
      unifiedStorage.removeItem('userToken').catch(() => undefined),
      unifiedStorage.removeItem('attendance.offlineQueue.v1').catch(() => undefined),
      );
    }
    await Promise.all(removals);
    secureTokenStorage.clearMemoryOnlyData();
    memoryAccess = null;
    memoryRefresh = null;
  },
};

export default tokenStore;
