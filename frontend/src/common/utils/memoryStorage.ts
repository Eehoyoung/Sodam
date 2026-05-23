/**
 * Centralized MemoryStorage utility
 * 메모리 기반 스토리지 폴백 구현
 *
 * WSOD 해결을 위해 중복된 MemoryStorage 구현을 통합
 * AuthContext, authService, api에서 공통으로 사용
 */

class MemoryStorage {
    private storage: Map<string, string> = new Map();

    async getItem(key: string): Promise<string | null> {
        return this.storage.get(key) || null;
    }

    async setItem(key: string, value: string): Promise<void> {
        this.storage.set(key, value);
    }

    async removeItem(key: string): Promise<void> {
        this.storage.delete(key);
    }

    async clear(): Promise<void> {
        this.storage.clear();
    }

    async getAllKeys(): Promise<string[]> {
        return Array.from(this.storage.keys());
    }

    // 디버깅을 위한 현재 저장된 키들 확인
    getStoredKeys(): string[] {
        return Array.from(this.storage.keys());
    }

    // 저장된 항목 수 확인
    getSize(): number {
        return this.storage.size;
    }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const memoryStorage = new MemoryStorage();

// 클래스도 내보내기 (필요한 경우)
export {MemoryStorage};

export default memoryStorage;
