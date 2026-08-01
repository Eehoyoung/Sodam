import {NativeModules} from 'react-native';

export type SecureTokenKey = 'accessToken' | 'refreshToken' | 'offlineAttendanceQueue';

interface NativeSecureTokenStorage {
  getItem(key: SecureTokenKey): Promise<string | null>;
  setItem(key: SecureTokenKey, value: string): Promise<void>;
  removeItem(key: SecureTokenKey): Promise<void>;
}

const memoryDataClearers = new Set<() => void>();

export function registerMemorySensitiveDataClearer(clearer: () => void): () => void {
  memoryDataClearers.add(clearer);
  return () => memoryDataClearers.delete(clearer);
}

function nativeStore(): NativeSecureTokenStorage | null {
  const modules = NativeModules as unknown as Record<string, unknown> | undefined;
  const candidate = modules?.SodamSecureTokenStorage;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const store = candidate as Partial<NativeSecureTokenStorage>;
  return typeof store.getItem === 'function'
    && typeof store.setItem === 'function'
    && typeof store.removeItem === 'function'
    ? store as NativeSecureTokenStorage
    : null;
}

/**
 * Bearer credential 전용 네이티브 보안 저장소.
 *
 * Android는 Android Keystore로 암호화한 SharedPreferences를, iOS 구현이 없는 개발/테스트
 * 환경은 메모리 전용 동작을 사용한다. 어떤 경우에도 AsyncStorage로 폴백하지 않는다.
 */
export const secureTokenStorage = {
  hasNativeModuleRegistry(): boolean {
    return NativeModules !== null && NativeModules !== undefined;
  },

  isAvailable(): boolean {
    return nativeStore() !== null;
  },

  async getItem(key: SecureTokenKey): Promise<string | null> {
    const store = nativeStore();
    if (!store) {
      return null;
    }
    try {
      return await store.getItem(key);
    } catch {
      return null;
    }
  },

  async setItem(key: SecureTokenKey, value: string): Promise<boolean> {
    const store = nativeStore();
    if (!store) {
      return false;
    }
    try {
      await store.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  async removeItem(key: SecureTokenKey): Promise<void> {
    const store = nativeStore();
    if (!store) {
      return;
    }
    try {
      await store.removeItem(key);
    } catch {
      // 저장소 제거 실패는 앱 로그에 token을 남기지 않고 메모리 세션만 즉시 폐기한다.
    }
  },

  clearMemoryOnlyData(): void {
    memoryDataClearers.forEach(clearer => clearer());
  },
};

export default secureTokenStorage;
