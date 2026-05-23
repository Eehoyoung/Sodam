/**
 * 통합 스토리지 유틸리티
 * AsyncStorage와 memoryStorage를 통합하여 일관된 인터페이스 제공
 * TanStack Query와 연동 가능한 영구 저장소 기능
 */

import {memoryStorage} from './memoryStorage';

/**
 * 스토리지 인터페이스 정의
 */
export interface StorageInterface {
    getItem(key: string): Promise<string | null>;

    setItem(key: string, value: string): Promise<void>;

    removeItem(key: string): Promise<void>;

    clear(): Promise<void>;

    getAllKeys(): Promise<string[]>;
}

/**
 * 스토리지 타입 정의
 */
export type StorageType = 'async' | 'memory';

/**
 * 스토리지 설정 인터페이스
 */
export interface StorageConfig {
    enableAsyncStorage: boolean;
    fallbackToMemory: boolean;
    timeout: number;
    enableLogging: boolean;
    keyPrefix?: string;
}

/**
 * 기본 스토리지 설정
 */
const defaultConfig: StorageConfig = {
    enableAsyncStorage: true,
    fallbackToMemory: true,
    timeout: 1000, // 1초
    enableLogging: false, // 로그캣 노이즈 방지를 위해 기본 비활성화
    keyPrefix: 'sodam_',
};

/**
 * 통합 스토리지 클래스
 * AsyncStorage와 memoryStorage를 통합하여 관리
 */
export class UnifiedStorage implements StorageInterface {
    private static instance: UnifiedStorage;
    private asyncStorage: any = null;
    private currentStorage: StorageInterface;
    private storageType: StorageType = 'memory';
    private isReady = false;
    private config: StorageConfig;
    private initPromise: Promise<void> | null = null;

    private constructor(config: Partial<StorageConfig> = {}) {
        this.config = {...defaultConfig, ...config};
        this.currentStorage = memoryStorage;
        this.log('UnifiedStorage 인스턴스 생성');
    }

    /**
     * 싱글톤 인스턴스 반환
     */
    public static getInstance(config?: Partial<StorageConfig>): UnifiedStorage {
        if (!UnifiedStorage.instance) {
            UnifiedStorage.instance = new UnifiedStorage(config);
        }
        return UnifiedStorage.instance;
    }

    /**
     * 스토리지 초기화
     */
    public async initialize(): Promise<void> {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._initialize();
        return this.initPromise;
    }

    // StorageInterface 구현
    public async getItem(key: string): Promise<string | null> {
        await this.initialize();
        return this.currentStorage.getItem(key);
    }

    public async setItem(key: string, value: string): Promise<void> {
        await this.initialize();
        return this.currentStorage.setItem(key, value);
    }

    public async removeItem(key: string): Promise<void> {
        await this.initialize();
        return this.currentStorage.removeItem(key);
    }

    public async clear(): Promise<void> {
        await this.initialize();
        return this.currentStorage.clear();
    }

    public async getAllKeys(): Promise<string[]> {
        await this.initialize();
        return this.currentStorage.getAllKeys();
    }

    /**
     * JSON 객체 저장
     */
    public async setObject<T>(key: string, value: T): Promise<void> {
        const jsonString = JSON.stringify(value);
        return this.setItem(key, jsonString);
    }

    /**
     * JSON 객체 조회
     */
    public async getObject<T>(key: string): Promise<T | null> {
        const jsonString = await this.getItem(key);
        if (!jsonString) return null;

        try {
            return JSON.parse(jsonString) as T;
        } catch (error) {
            this.log(`JSON 파싱 오류 (${key}):`, error);
            return null;
        }
    }

    /**
     * 다중 키 조회
     */
    public async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
        const results: Array<[string, string | null]> = [];

        for (const key of keys) {
            const value = await this.getItem(key);
            results.push([key, value]);
        }

        return results;
    }

    /**
     * 다중 키 저장
     */
    public async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
        for (const [key, value] of keyValuePairs) {
            await this.setItem(key, value);
        }
    }

    /**
     * 다중 키 삭제
     */
    public async multiRemove(keys: string[]): Promise<void> {
        for (const key of keys) {
            await this.removeItem(key);
        }
    }

    /**
     * 스토리지 상태 정보
     */
    public getStorageInfo(): {
        type: StorageType;
        isReady: boolean;
        config: StorageConfig;
    } {
        return {
            type: this.storageType,
            isReady: this.isReady,
            config: {...this.config},
        };
    }

    /**
     * TanStack Query와 연동을 위한 영구 저장소 기능
     */
    public async persistQueryData(queryKey: string, data: any, ttl?: number): Promise<void> {
        const persistData = {
            data,
            timestamp: Date.now(),
            ttl: ttl || 24 * 60 * 60 * 1000, // 기본 24시간
        };

        const key = `query_${queryKey}`;
        await this.setObject(key, persistData);
        this.log(`쿼리 데이터 영구 저장: ${queryKey}`);
    }

    // 추가 유틸리티 메서드들

    /**
     * 영구 저장된 쿼리 데이터 조회
     */
    public async getPersistedQueryData<T>(queryKey: string): Promise<T | null> {
        const key = `query_${queryKey}`;
        const persistData = await this.getObject<{
            data: T;
            timestamp: number;
            ttl: number;
        }>(key);

        if (!persistData) return null;

        // TTL 확인
        const now = Date.now();
        if (now - persistData.timestamp > persistData.ttl) {
            await this.removeItem(key);
            this.log(`만료된 쿼리 데이터 삭제: ${queryKey}`);
            return null;
        }

        this.log(`영구 저장된 쿼리 데이터 조회: ${queryKey}`);
        return persistData.data;
    }

    /**
     * 만료된 쿼리 데이터 정리
     */
    public async cleanupExpiredQueryData(): Promise<number> {
        const keys = await this.getAllKeys();
        const queryKeys = keys.filter(key => key.startsWith('query_'));
        let cleanedCount = 0;

        for (const key of queryKeys) {
            const persistData = await this.getObject<{
                timestamp: number;
                ttl: number;
            }>(key);

            if (persistData) {
                const now = Date.now();
                if (now - persistData.timestamp > persistData.ttl) {
                    await this.removeItem(key);
                    cleanedCount++;
                }
            }
        }

        this.log(`만료된 쿼리 데이터 ${cleanedCount}개 정리 완료`);
        return cleanedCount;
    }

    private async _initialize(): Promise<void> {
        if (this.isReady) return;

        this.log('스토리지 초기화 시작');

        if (this.config.enableAsyncStorage) {
            try {
                await this.initializeAsyncStorage();
            } catch (error) {
                this.log('AsyncStorage 초기화 실패, memoryStorage 사용:', error);
                if (this.config.fallbackToMemory) {
                    this.useMemoryStorage();
                } else {
                    throw error;
                }
            }
        } else {
            this.useMemoryStorage();
        }

        this.isReady = true;
        this.log(`스토리지 초기화 완료 (타입: ${this.storageType})`);
    }

    /**
     * AsyncStorage 초기화
     */
    private async initializeAsyncStorage(): Promise<void> {
        try {
            this.log('AsyncStorage 로드 시도');
            const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
            const AsyncStorage = AsyncStorageModule.default;

            if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
                throw new Error('AsyncStorage가 사용 불가능합니다');
            }

            // 기능 테스트
            const testKey = `${this.config.keyPrefix}__test__`;
            const testPromise = AsyncStorage.getItem(testKey);
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('AsyncStorage 타임아웃')), this.config.timeout)
            );

            await Promise.race([testPromise, timeoutPromise]);

            this.asyncStorage = AsyncStorage;
            this.currentStorage = this.createAsyncStorageWrapper();
            this.storageType = 'async';
            this.log('AsyncStorage 초기화 성공');
        } catch (error) {
            this.log('AsyncStorage 초기화 실패:', error);
            throw error;
        }
    }

    /**
     * memoryStorage 사용 설정
     */
    private useMemoryStorage(): void {
        this.currentStorage = memoryStorage;
        this.storageType = 'memory';
        this.log('memoryStorage 사용 설정');
    }

    /**
     * AsyncStorage 래퍼 생성
     */
    private createAsyncStorageWrapper(): StorageInterface {
        return {
            getItem: async (key: string) => {
                try {
                    const prefixedKey = this.addKeyPrefix(key);
                    const result = await this.asyncStorage.getItem(prefixedKey);
                    this.log(`getItem: ${key} = ${result ? '데이터 있음' : 'null'}`);
                    return result;
                } catch (error) {
                    this.log(`getItem 오류 (${key}):`, error);
                    if (this.config.fallbackToMemory) {
                        return memoryStorage.getItem(key);
                    }
                    throw error;
                }
            },

            setItem: async (key: string, value: string) => {
                try {
                    const prefixedKey = this.addKeyPrefix(key);
                    await this.asyncStorage.setItem(prefixedKey, value);
                    this.log(`setItem: ${key} 저장 완료`);
                } catch (error) {
                    this.log(`setItem 오류 (${key}):`, error);
                    if (this.config.fallbackToMemory) {
                        return memoryStorage.setItem(key, value);
                    }
                    throw error;
                }
            },

            removeItem: async (key: string) => {
                try {
                    const prefixedKey = this.addKeyPrefix(key);
                    await this.asyncStorage.removeItem(prefixedKey);
                    this.log(`removeItem: ${key} 삭제 완료`);
                } catch (error) {
                    this.log(`removeItem 오류 (${key}):`, error);
                    if (this.config.fallbackToMemory) {
                        return memoryStorage.removeItem(key);
                    }
                    throw error;
                }
            },

            clear: async () => {
                try {
                    const keys = await this.asyncStorage.getAllKeys();
                    const prefixedKeys = keys.filter((key: string) =>
                        key.startsWith(this.config.keyPrefix || '')
                    );
                    await this.asyncStorage.multiRemove(prefixedKeys);
                    this.log('clear: 모든 데이터 삭제 완료');
                } catch (error) {
                    this.log('clear 오류:', error);
                    if (this.config.fallbackToMemory) {
                        return memoryStorage.clear();
                    }
                    throw error;
                }
            },

            getAllKeys: async () => {
                try {
                    const keys = await this.asyncStorage.getAllKeys();
                    const filteredKeys = keys
                        .filter((key: string) => key.startsWith(this.config.keyPrefix || ''))
                        .map((key: string) => this.removeKeyPrefix(key));
                    this.log(`getAllKeys: ${filteredKeys.length}개 키 반환`);
                    return filteredKeys;
                } catch (error) {
                    this.log('getAllKeys 오류:', error);
                    if (this.config.fallbackToMemory) {
                        return memoryStorage.getAllKeys();
                    }
                    throw error;
                }
            },
        };
    }

    /**
     * 키에 접두사 추가
     */
    private addKeyPrefix(key: string): string {
        return this.config.keyPrefix ? `${this.config.keyPrefix}${key}` : key;
    }

    /**
     * 키에서 접두사 제거
     */
    private removeKeyPrefix(key: string): string {
        if (this.config.keyPrefix && key.startsWith(this.config.keyPrefix)) {
            return key.substring(this.config.keyPrefix.length);
        }
        return key;
    }

    /**
     * 로깅 유틸리티
     */
    private log(message: string, ...args: any[]): void {
        if (this.config.enableLogging) {
            console.log(`[UnifiedStorage]`, message, ...args);
        }
    }
}

/**
 * 기본 통합 스토리지 인스턴스
 */
export const unifiedStorage = UnifiedStorage.getInstance();

/**
 * 특정 설정으로 통합 스토리지 인스턴스 생성
 */
export const createUnifiedStorage = (config: Partial<StorageConfig>): UnifiedStorage => {
    return UnifiedStorage.getInstance(config);
};

/**
 * 스토리지 타입별 인스턴스 생성 헬퍼
 */
export const storageHelpers = {
    /**
     * AsyncStorage 우선 사용 (fallback: memory)
     */
    createAsyncFirst: () => createUnifiedStorage({
        enableAsyncStorage: true,
        fallbackToMemory: true,
    }),

    /**
     * 메모리 스토리지만 사용
     */
    createMemoryOnly: () => createUnifiedStorage({
        enableAsyncStorage: false,
        fallbackToMemory: false,
    }),

    /**
     * 프로덕션용 설정
     */
    createProduction: () => createUnifiedStorage({
        enableAsyncStorage: true,
        fallbackToMemory: true,
        timeout: 2000,
        enableLogging: false,
        keyPrefix: 'sodam_prod_',
    }),

    /**
     * 개발용 설정
     */
    createDevelopment: () => createUnifiedStorage({
        enableAsyncStorage: true,
        fallbackToMemory: true,
        timeout: 1000,
        enableLogging: true,
        keyPrefix: 'sodam_dev_',
    }),
};
