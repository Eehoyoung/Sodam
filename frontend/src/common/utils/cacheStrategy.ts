/**
 * 백엔드 Redis와 연동한 최적화된 캐시 전략
 * 데이터 타입별 특성을 고려한 세밀한 캐시 설정
 */

export interface CacheConfig {
    staleTime: number;    // 데이터가 신선한 것으로 간주되는 시간
    gcTime: number;       // 가비지 컬렉션 시간 (구 cacheTime)
    refetchInterval?: number; // 자동 갱신 간격
    retry: number;        // 재시도 횟수
    retryDelay?: (attemptIndex: number) => number; // 재시도 지연 시간
}

/**
 * 데이터 타입별 캐시 전략 정의
 * 백엔드 Redis TTL과 동기화된 설정
 */
export const cacheStrategies = {
    // 인증 관련 - 보안이 중요하므로 상대적으로 짧은 캐시
    'user-profile': {
        staleTime: 10 * 60 * 1000,      // 10분
        gcTime: 30 * 60 * 1000,         // 30분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'auth-status': {
        staleTime: 5 * 60 * 1000,       // 5분
        gcTime: 10 * 60 * 1000,         // 10분
        retry: 1,
        retryDelay: () => 1000,
    } as CacheConfig,

    // 근태 관리 - 실시간성이 중요
    'attendance-current': {
        staleTime: 30 * 1000,           // 30초
        gcTime: 2 * 60 * 1000,          // 2분
        refetchInterval: 60 * 1000,     // 1분마다 자동 갱신
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 3000),
    } as CacheConfig,

    'attendance-records': {
        staleTime: 2 * 60 * 1000,       // 2분
        gcTime: 5 * 60 * 1000,          // 5분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'attendance-store': {
        staleTime: 1 * 60 * 1000,       // 1분 (매장 관리자용)
        gcTime: 3 * 60 * 1000,          // 3분
        refetchInterval: 5 * 60 * 1000, // 5분마다 자동 갱신
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'attendance-employee': {
        staleTime: 3 * 60 * 1000,       // 3분
        gcTime: 10 * 60 * 1000,         // 10분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'attendance-monthly': {
        staleTime: 10 * 60 * 1000,      // 10분 (월별 데이터는 안정적)
        gcTime: 30 * 60 * 1000,         // 30분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'attendance-statistics': {
        staleTime: 15 * 60 * 1000,      // 15분
        gcTime: 30 * 60 * 1000,         // 30분
        retry: 1,
        retryDelay: () => 2000,
    } as CacheConfig,

    // 급여 관리 - 상대적으로 안정적인 데이터
    'salary-records': {
        staleTime: 30 * 60 * 1000,      // 30분
        gcTime: 60 * 60 * 1000,         // 1시간
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'salary-employee': {
        staleTime: 30 * 60 * 1000,      // 30분
        gcTime: 60 * 60 * 1000,         // 1시간
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'salary-store': {
        staleTime: 15 * 60 * 1000,      // 15분 (매장 관리자용)
        gcTime: 45 * 60 * 1000,         // 45분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'salary-statistics': {
        staleTime: 60 * 60 * 1000,      // 1시간 (통계는 매우 안정적)
        gcTime: 2 * 60 * 60 * 1000,     // 2시간
        retry: 1,
        retryDelay: () => 3000,
    } as CacheConfig,

    'salary-policy': {
        staleTime: 60 * 60 * 1000,      // 1시간 (정책은 자주 변경되지 않음)
        gcTime: 2 * 60 * 60 * 1000,     // 2시간
        retry: 1,
        retryDelay: () => 2000,
    } as CacheConfig,

    'salary-calculation': {
        staleTime: 5 * 60 * 1000,       // 5분 (계산 결과는 상대적으로 짧은 캐시)
        gcTime: 15 * 60 * 1000,         // 15분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    // 매장 관리 - 중간 정도의 안정성
    'store-info': {
        staleTime: 15 * 60 * 1000,      // 15분
        gcTime: 45 * 60 * 1000,         // 45분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'store-employees': {
        staleTime: 10 * 60 * 1000,      // 10분
        gcTime: 30 * 60 * 1000,         // 30분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    // 정보 서비스 - 매우 안정적인 데이터
    'info-tips': {
        staleTime: 2 * 60 * 60 * 1000,  // 2시간
        gcTime: 4 * 60 * 60 * 1000,     // 4시간
        retry: 1,
        retryDelay: () => 5000,
    } as CacheConfig,

    'info-policies': {
        staleTime: 4 * 60 * 60 * 1000,  // 4시간
        gcTime: 8 * 60 * 60 * 1000,     // 8시간
        retry: 1,
        retryDelay: () => 5000,
    } as CacheConfig,

    'info-labor': {
        staleTime: 2 * 60 * 60 * 1000,  // 2시간
        gcTime: 4 * 60 * 60 * 1000,     // 4시간
        retry: 1,
        retryDelay: () => 5000,
    } as CacheConfig,

    // Q&A - 중간 정도의 안정성
    'qna-questions': {
        staleTime: 30 * 60 * 1000,      // 30분
        gcTime: 60 * 60 * 1000,         // 1시간
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    'qna-question': {
        staleTime: 15 * 60 * 1000,      // 15분
        gcTime: 30 * 60 * 1000,         // 30분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,

    // 기본 전략 (fallback)
    'default': {
        staleTime: 5 * 60 * 1000,       // 5분
        gcTime: 10 * 60 * 1000,         // 10분
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    } as CacheConfig,
} as const;

/**
 * 데이터 타입에 따른 캐시 전략을 반환하는 함수
 * @param dataType 데이터 타입 키
 * @returns 해당 데이터 타입의 캐시 설정
 */
export const getCacheStrategy = (dataType: keyof typeof cacheStrategies): CacheConfig => {
    return cacheStrategies[dataType] || cacheStrategies.default;
};

/**
 * 네트워크 상태에 따른 동적 캐시 전략 조정
 * @param baseStrategy 기본 캐시 전략
 * @param networkType 네트워크 타입 ('wifi' | 'cellular' | 'offline')
 * @returns 조정된 캐시 전략
 */
export const adjustCacheForNetwork = (
    baseStrategy: CacheConfig,
    networkType: 'wifi' | 'cellular' | 'offline'
): CacheConfig => {
    switch (networkType) {
        case 'wifi':
            // WiFi 환경에서는 기본 전략 사용
            return baseStrategy;

        case 'cellular':
            // 셀룰러 환경에서는 캐시 시간을 늘려 네트워크 사용량 절약
            return {
                ...baseStrategy,
                staleTime: baseStrategy.staleTime * 1.5,
                gcTime: baseStrategy.gcTime * 1.5,
                retry: Math.max(1, baseStrategy.retry - 1), // 재시도 횟수 감소
            };

        case 'offline':
            // 오프라인 환경에서는 캐시 시간을 대폭 늘림
            return {
                ...baseStrategy,
                staleTime: baseStrategy.staleTime * 10,
                gcTime: baseStrategy.gcTime * 10,
                retry: 0, // 재시도 없음
            };

        default:
            return baseStrategy;
    }
};

/**
 * 사용자 역할에 따른 캐시 전략 조정
 * @param baseStrategy 기본 캐시 전략
 * @param userRole 사용자 역할 ('EMPLOYEE' | 'MANAGER' | 'MASTER')
 * @returns 조정된 캐시 전략
 */
export const adjustCacheForUserRole = (
    baseStrategy: CacheConfig,
    userRole: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER'
): CacheConfig => {
    switch (userRole) {
        case 'MASTER':
        case 'MANAGER':
            // 관리자는 더 자주 업데이트된 데이터가 필요
            return {
                ...baseStrategy,
                staleTime: baseStrategy.staleTime * 0.7, // 30% 단축
                refetchInterval: baseStrategy.refetchInterval ? baseStrategy.refetchInterval * 0.8 : undefined,
            };

        case 'EMPLOYEE':
        case 'USER':
            // 일반 직원은 기본 전략 사용
            return baseStrategy;

        default:
            return baseStrategy;
    }
};

/**
 * 시간대에 따른 캐시 전략 조정
 * 업무 시간 중에는 더 자주 업데이트, 업무 시간 외에는 캐시 시간 연장
 * @param baseStrategy 기본 캐시 전략
 * @param isBusinessHours 업무 시간 여부
 * @returns 조정된 캐시 전략
 */
export const adjustCacheForBusinessHours = (
    baseStrategy: CacheConfig,
    isBusinessHours: boolean
): CacheConfig => {
    if (isBusinessHours) {
        // 업무 시간 중에는 더 자주 업데이트
        return {
            ...baseStrategy,
            staleTime: baseStrategy.staleTime * 0.8, // 20% 단축
            refetchInterval: baseStrategy.refetchInterval ? baseStrategy.refetchInterval * 0.8 : undefined,
        };
    } else {
        // 업무 시간 외에는 캐시 시간 연장
        return {
            ...baseStrategy,
            staleTime: baseStrategy.staleTime * 2, // 2배 연장
            gcTime: baseStrategy.gcTime * 1.5, // 1.5배 연장
            refetchInterval: undefined, // 자동 갱신 비활성화
        };
    }
};

/**
 * 현재 시간이 업무 시간인지 확인하는 함수
 * @param businessStartHour 업무 시작 시간 (기본: 9시)
 * @param businessEndHour 업무 종료 시간 (기본: 22시)
 * @returns 업무 시간 여부
 */
export const isBusinessHours = (
    businessStartHour: number = 9,
    businessEndHour: number = 22
): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0: 일요일, 6: 토요일

    // 주말은 업무 시간이 아님
    if (currentDay === 0 || currentDay === 6) {
        return false;
    }

    return currentHour >= businessStartHour && currentHour < businessEndHour;
};

/**
 * 종합적인 캐시 전략 생성 함수
 * 모든 조건을 고려하여 최적화된 캐시 전략을 반환
 * @param dataType 데이터 타입
 * @param options 추가 옵션
 * @returns 최적화된 캐시 전략
 */
export const createOptimizedCacheStrategy = (
    dataType: keyof typeof cacheStrategies,
    options?: {
        networkType?: 'wifi' | 'cellular' | 'offline';
        userRole?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER';
        customBusinessHours?: { start: number; end: number };
    }
): CacheConfig => {
    let strategy = getCacheStrategy(dataType);

    // 네트워크 상태에 따른 조정
    if (options?.networkType) {
        strategy = adjustCacheForNetwork(strategy, options.networkType);
    }

    // 사용자 역할에 따른 조정
    if (options?.userRole) {
        strategy = adjustCacheForUserRole(strategy, options.userRole);
    }

    // 업무 시간에 따른 조정
    const businessHours = options?.customBusinessHours;
    const isWorkingHours = isBusinessHours(
        businessHours?.start,
        businessHours?.end
    );
    strategy = adjustCacheForBusinessHours(strategy, isWorkingHours);

    return strategy;
};

/**
 * 캐시 전략 디버깅을 위한 로깅 함수
 * @param dataType 데이터 타입
 * @param strategy 적용된 캐시 전략
 * @param context 추가 컨텍스트 정보
 */
export const logCacheStrategy = (
    dataType: string,
    strategy: CacheConfig,
    context?: string
): void => {
    if (__DEV__) {
        console.log(`[Cache Strategy] ${dataType}${context ? ` (${context})` : ''}:`, {
            staleTime: `${strategy.staleTime / 1000}s`,
            gcTime: `${strategy.gcTime / 1000}s`,
            refetchInterval: strategy.refetchInterval ? `${strategy.refetchInterval / 1000}s` : 'disabled',
            retry: strategy.retry,
        });
    }
};
