import {useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';

/**
 * 성능 지표 타입 정의
 */
export interface PerformanceMetrics {
    // 캐시 관련 지표
    cacheHitRate: number;           // 캐시 히트율 (%)
    cacheMissRate: number;          // 캐시 미스율 (%)
    totalCacheSize: number;         // 총 캐시 크기 (개수)
    staleCacheCount: number;        // 만료된 캐시 개수

    // 네트워크 관련 지표
    totalNetworkRequests: number;   // 총 네트워크 요청 수
    successfulRequests: number;     // 성공한 요청 수
    failedRequests: number;         // 실패한 요청 수
    averageResponseTime: number;    // 평균 응답 시간 (ms)

    // 쿼리 관련 지표
    activeQueries: number;          // 활성 쿼리 수
    inactiveQueries: number;        // 비활성 쿼리 수
    loadingQueries: number;         // 로딩 중인 쿼리 수
    errorQueries: number;           // 에러 상태 쿼리 수

    // 뮤테이션 관련 지표
    pendingMutations: number;       // 대기 중인 뮤테이션 수
    successfulMutations: number;    // 성공한 뮤테이션 수
    failedMutations: number;        // 실패한 뮤테이션 수

    // 메모리 관련 지표
    estimatedMemoryUsage: number;   // 예상 메모리 사용량 (KB)
    gcCollections: number;          // 가비지 컬렉션 횟수
}

/**
 * 성능 임계값 설정
 */
export interface PerformanceThresholds {
    maxCacheSize: number;           // 최대 캐시 크기
    minCacheHitRate: number;        // 최소 캐시 히트율 (%)
    maxResponseTime: number;        // 최대 허용 응답 시간 (ms)
    maxMemoryUsage: number;         // 최대 메모리 사용량 (KB)
    maxFailureRate: number;         // 최대 실패율 (%)
}

/**
 * 성능 경고 타입
 */
export interface PerformanceAlert {
    type: 'cache' | 'network' | 'memory' | 'error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
    metric: keyof PerformanceMetrics;
    value: number;
    threshold: number;
}

/**
 * 성능 모니터링 설정
 */
export interface PerformanceMonitorConfig {
    enabled: boolean;
    monitoringInterval: number;     // 모니터링 간격 (ms)
    alertThresholds: PerformanceThresholds;
    enableDetailedLogging: boolean;
    enableAlerts: boolean;
    maxAlertHistory: number;        // 최대 알림 기록 수
}

/**
 * 기본 성능 모니터링 설정
 */
const defaultConfig: PerformanceMonitorConfig = {
    enabled: true,
    monitoringInterval: 30000, // 30초
    alertThresholds: {
        maxCacheSize: 1000,
        minCacheHitRate: 70, // 70%
        maxResponseTime: 5000, // 5초
        maxMemoryUsage: 50 * 1024, // 50MB
        maxFailureRate: 10, // 10%
    },
    enableDetailedLogging: __DEV__,
    enableAlerts: true,
    maxAlertHistory: 50,
};

/**
 * 요청 추적을 위한 인터페이스
 */
interface RequestTracker {
    startTime: number;
    endTime?: number;
    success?: boolean;
    error?: any;
    queryKey: string;
}

/**
 * TanStack Query 성능 모니터링 훅
 * 캐시 효율성, 네트워크 성능, 메모리 사용량 등을 모니터링
 */
export const usePerformanceMonitor = (config: Partial<PerformanceMonitorConfig> = {}) => {
    const queryClient = useQueryClient();
    const finalConfig = {...defaultConfig, ...config};

    // 상태 관리
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        cacheHitRate: 0,
        cacheMissRate: 0,
        totalCacheSize: 0,
        staleCacheCount: 0,
        totalNetworkRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        activeQueries: 0,
        inactiveQueries: 0,
        loadingQueries: 0,
        errorQueries: 0,
        pendingMutations: 0,
        successfulMutations: 0,
        failedMutations: 0,
        estimatedMemoryUsage: 0,
        gcCollections: 0,
    });

    const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);

    // 추적 데이터
    const requestTrackers = useRef<Map<string, RequestTracker>>(new Map());
    const responseTimes = useRef<number[]>([]);
    const cacheHits = useRef(0);
    const cacheMisses = useRef(0);
    const gcCount = useRef(0);
    const monitoringInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * 성능 지표 계산
     */
    const calculateMetrics = useCallback((): PerformanceMetrics => {
        const queryCache = queryClient.getQueryCache();
        const mutationCache = queryClient.getMutationCache();

        const queries = queryCache.getAll();
        const mutations = mutationCache.getAll();

        // 쿼리 상태별 분류
        const activeQueries = queries.filter(q => q.getObserversCount() > 0).length;
        const loadingQueries = queries.filter(q => q.state.status === 'pending').length;
        const errorQueries = queries.filter(q => q.state.status === 'error').length;
        const staleQueries = queries.filter(q => q.isStale()).length;

        // 뮤테이션 상태별 분류
        const pendingMutations = mutations.filter(m => m.state.status === 'pending').length;
        const successMutations = mutations.filter(m => m.state.status === 'success').length;
        const errorMutations = mutations.filter(m => m.state.status === 'error').length;

        // 캐시 히트율 계산
        const totalCacheAttempts = cacheHits.current + cacheMisses.current;
        const cacheHitRate = totalCacheAttempts > 0 ? (cacheHits.current / totalCacheAttempts) * 100 : 0;
        const cacheMissRate = 100 - cacheHitRate;

        // 평균 응답 시간 계산
        const avgResponseTime = responseTimes.current.length > 0
            ? responseTimes.current.reduce((sum, time) => sum + time, 0) / responseTimes.current.length
            : 0;

        // 네트워크 요청 통계
        const completedTrackers = Array.from(requestTrackers.current.values()).filter(t => t.endTime);
        const successfulRequests = completedTrackers.filter(t => t.success).length;
        const failedRequests = completedTrackers.filter(t => !t.success).length;

        // 메모리 사용량 추정 (대략적인 계산)
        const estimatedMemoryUsage = queries.reduce((total, query) => {
            const dataSize = query.state.data ? JSON.stringify(query.state.data).length : 0;
            return total + dataSize;
        }, 0) / 1024; // KB 단위

        return {
            cacheHitRate: Math.round(cacheHitRate * 100) / 100,
            cacheMissRate: Math.round(cacheMissRate * 100) / 100,
            totalCacheSize: queries.length,
            staleCacheCount: staleQueries,
            totalNetworkRequests: requestTrackers.current.size,
            successfulRequests,
            failedRequests,
            averageResponseTime: Math.round(avgResponseTime),
            activeQueries,
            inactiveQueries: queries.length - activeQueries,
            loadingQueries,
            errorQueries,
            pendingMutations,
            successfulMutations: successMutations,
            failedMutations: errorMutations,
            estimatedMemoryUsage: Math.round(estimatedMemoryUsage),
            gcCollections: gcCount.current,
        };
    }, [queryClient]);

    /**
     * 성능 경고 생성
     */
    const createAlert = useCallback((
        type: PerformanceAlert['type'],
        severity: PerformanceAlert['severity'],
        message: string,
        metric: keyof PerformanceMetrics,
        value: number,
        threshold: number
    ): PerformanceAlert => ({
        type,
        severity,
        message,
        timestamp: new Date(),
        metric,
        value,
        threshold,
    }), []);

    /**
     * 성능 임계값 확인 및 경고 생성
     */
    const checkThresholds = useCallback((currentMetrics: PerformanceMetrics) => {
        if (!finalConfig.enableAlerts) return;

        const newAlerts: PerformanceAlert[] = [];
        const thresholds = finalConfig.alertThresholds;

        // 캐시 크기 확인
        if (currentMetrics.totalCacheSize > thresholds.maxCacheSize) {
            newAlerts.push(createAlert(
                'cache',
                'medium',
                `캐시 크기가 임계값을 초과했습니다 (${currentMetrics.totalCacheSize}/${thresholds.maxCacheSize})`,
                'totalCacheSize',
                currentMetrics.totalCacheSize,
                thresholds.maxCacheSize
            ));
        }

        // 캐시 히트율 확인
        if (currentMetrics.cacheHitRate < thresholds.minCacheHitRate) {
            newAlerts.push(createAlert(
                'cache',
                'high',
                `캐시 히트율이 낮습니다 (${currentMetrics.cacheHitRate}% < ${thresholds.minCacheHitRate}%)`,
                'cacheHitRate',
                currentMetrics.cacheHitRate,
                thresholds.minCacheHitRate
            ));
        }

        // 응답 시간 확인
        if (currentMetrics.averageResponseTime > thresholds.maxResponseTime) {
            newAlerts.push(createAlert(
                'network',
                'high',
                `평균 응답 시간이 느립니다 (${currentMetrics.averageResponseTime}ms > ${thresholds.maxResponseTime}ms)`,
                'averageResponseTime',
                currentMetrics.averageResponseTime,
                thresholds.maxResponseTime
            ));
        }

        // 메모리 사용량 확인
        if (currentMetrics.estimatedMemoryUsage > thresholds.maxMemoryUsage) {
            newAlerts.push(createAlert(
                'memory',
                'critical',
                `메모리 사용량이 높습니다 (${currentMetrics.estimatedMemoryUsage}KB > ${thresholds.maxMemoryUsage}KB)`,
                'estimatedMemoryUsage',
                currentMetrics.estimatedMemoryUsage,
                thresholds.maxMemoryUsage
            ));
        }

        // 실패율 확인
        const totalRequests = currentMetrics.successfulRequests + currentMetrics.failedRequests;
        if (totalRequests > 0) {
            const failureRate = (currentMetrics.failedRequests / totalRequests) * 100;
            if (failureRate > thresholds.maxFailureRate) {
                newAlerts.push(createAlert(
                    'error',
                    'high',
                    `요청 실패율이 높습니다 (${failureRate.toFixed(1)}% > ${thresholds.maxFailureRate}%)`,
                    'failedRequests',
                    failureRate,
                    thresholds.maxFailureRate
                ));
            }
        }

        // 새로운 경고가 있으면 추가
        if (newAlerts.length > 0) {
            setAlerts(prev => {
                const updated = [...prev, ...newAlerts];
                // 최대 기록 수 제한
                return updated.slice(-finalConfig.maxAlertHistory);
            });

            if (finalConfig.enableDetailedLogging) {
                newAlerts.forEach(alert => {
                    console.warn(`[Performance Alert] ${alert.severity.toUpperCase()}: ${alert.message}`);
                });
            }
        }
    }, [finalConfig, createAlert]);

    /**
     * 성능 지표 업데이트
     */
    const updateMetrics = useCallback(() => {
        if (!finalConfig.enabled) return;

        const currentMetrics = calculateMetrics();
        setMetrics(currentMetrics);

        // 임계값 확인
        checkThresholds(currentMetrics);

        if (finalConfig.enableDetailedLogging) {
            console.log('[Performance Monitor] 지표 업데이트:', {
                cacheHitRate: `${currentMetrics.cacheHitRate}%`,
                totalCacheSize: currentMetrics.totalCacheSize,
                averageResponseTime: `${currentMetrics.averageResponseTime}ms`,
                memoryUsage: `${currentMetrics.estimatedMemoryUsage}KB`,
            });
        }
    }, [finalConfig, calculateMetrics, checkThresholds]);

    /**
     * 요청 시작 추적
     */
    const trackRequestStart = useCallback((queryKey: string) => {
        const trackerId = `${queryKey}-${Date.now()}`;
        requestTrackers.current.set(trackerId, {
            startTime: Date.now(),
            queryKey,
        });
        return trackerId;
    }, []);

    /**
     * 요청 완료 추적
     */
    const trackRequestEnd = useCallback((trackerId: string, success: boolean, error?: any) => {
        const tracker = requestTrackers.current.get(trackerId);
        if (tracker) {
            const endTime = Date.now();
            const responseTime = endTime - tracker.startTime;

            tracker.endTime = endTime;
            tracker.success = success;
            tracker.error = error;

            // 응답 시간 기록
            responseTimes.current.push(responseTime);

            // 최근 100개 응답 시간만 유지
            if (responseTimes.current.length > 100) {
                responseTimes.current = responseTimes.current.slice(-100);
            }

            // 캐시 히트/미스 추적
            if (success) {
                cacheHits.current++;
            } else {
                cacheMisses.current++;
            }
        }
    }, []);

    /**
     * 캐시 정리 수행
     */
    const performCacheCleanup = useCallback(() => {
        const queryCache = queryClient.getQueryCache();
        const queries = queryCache.getAll();

        let cleanedCount = 0;

        queries.forEach(query => {
            // 오래된 비활성 쿼리 제거
            if (query.getObserversCount() === 0 && query.isStale()) {
                const lastUpdated = query.state.dataUpdatedAt;
                const now = Date.now();
                const ageInMinutes = (now - lastUpdated) / (1000 * 60);

                // 30분 이상 된 비활성 쿼리 제거
                if (ageInMinutes > 30) {
                    queryCache.remove(query);
                    cleanedCount++;
                }
            }
        });

        if (cleanedCount > 0) {
            gcCount.current++;
            console.log(`[Performance Monitor] 캐시 정리 완료: ${cleanedCount}개 쿼리 제거`);
        }

        return cleanedCount;
    }, [queryClient]);

    /**
     * 성능 최적화 제안 생성
     */
    const getOptimizationSuggestions = useCallback((): string[] => {
        const suggestions: string[] = [];

        if (metrics.cacheHitRate < 50) {
            suggestions.push('캐시 히트율이 낮습니다. staleTime을 늘려보세요.');
        }

        if (metrics.totalCacheSize > 500) {
            suggestions.push('캐시 크기가 큽니다. gcTime을 줄이거나 불필요한 쿼리를 정리하세요.');
        }

        if (metrics.averageResponseTime > 3000) {
            suggestions.push('응답 시간이 느립니다. 네트워크 상태를 확인하거나 쿼리를 최적화하세요.');
        }

        if (metrics.errorQueries > 10) {
            suggestions.push('에러 상태인 쿼리가 많습니다. 에러 처리를 개선하세요.');
        }

        if (metrics.estimatedMemoryUsage > 10 * 1024) { // 10MB
            suggestions.push('메모리 사용량이 높습니다. 캐시 정리를 수행하세요.');
        }

        return suggestions;
    }, [metrics]);

    /**
     * 성능 리포트 생성
     */
    const generatePerformanceReport = useCallback(() => {
        const report = {
            timestamp: new Date(),
            metrics,
            alerts: alerts.slice(-10), // 최근 10개 알림
            suggestions: getOptimizationSuggestions(),
            summary: {
                overallHealth: metrics.cacheHitRate > 70 && metrics.averageResponseTime < 2000 ? 'good' :
                    metrics.cacheHitRate > 50 && metrics.averageResponseTime < 5000 ? 'fair' : 'poor',
                criticalIssues: alerts.filter(a => a.severity === 'critical').length,
                totalQueries: metrics.activeQueries + metrics.inactiveQueries,
                cacheEfficiency: metrics.cacheHitRate,
            }
        };

        if (finalConfig.enableDetailedLogging) {
            console.log('[Performance Report]', report);
        }

        return report;
    }, [metrics, alerts, getOptimizationSuggestions, finalConfig.enableDetailedLogging]);

    /**
     * 모니터링 시작
     */
    const startMonitoring = useCallback(() => {
        if (isMonitoring || !finalConfig.enabled) return;

        setIsMonitoring(true);

        // 초기 지표 계산
        updateMetrics();

        // 주기적 모니터링 시작
        monitoringInterval.current = setInterval(() => {
            updateMetrics();
        }, finalConfig.monitoringInterval);

        console.log('[Performance Monitor] 모니터링 시작');
    }, [isMonitoring, finalConfig.enabled, finalConfig.monitoringInterval, updateMetrics]);

    /**
     * 모니터링 중지
     */
    const stopMonitoring = useCallback(() => {
        if (!isMonitoring) return;

        setIsMonitoring(false);

        if (monitoringInterval.current) {
            clearInterval(monitoringInterval.current as unknown as number);
            monitoringInterval.current = null;
        }

        console.log('[Performance Monitor] 모니터링 중지');
    }, [isMonitoring]);

    /**
     * 통계 초기화
     */
    const resetStats = useCallback(() => {
        cacheHits.current = 0;
        cacheMisses.current = 0;
        gcCount.current = 0;
        responseTimes.current = [];
        requestTrackers.current.clear();
        setAlerts([]);

        console.log('[Performance Monitor] 통계 초기화');
    }, []);

    /**
     * 컴포넌트 마운트 시 모니터링 시작
     */
    useEffect(() => {
        if (finalConfig.enabled) {
            startMonitoring();
        }

        return () => {
            stopMonitoring();
        };
    }, [finalConfig.enabled, startMonitoring, stopMonitoring]);

    /**
     * 쿼리 캐시 변화 감지
     */
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe(() => {
            // 캐시 변화 시 지표 업데이트 (throttled)
            if (isMonitoring) {
                setTimeout(updateMetrics, 1000);
            }
        });

        return unsubscribe;
    }, [queryClient, isMonitoring, updateMetrics]);

    return {
        // 상태
        metrics,
        alerts,
        isMonitoring,

        // 액션
        startMonitoring,
        stopMonitoring,
        resetStats,
        performCacheCleanup,

        // 유틸리티
        trackRequestStart,
        trackRequestEnd,
        generatePerformanceReport,
        getOptimizationSuggestions,

        // 수동 업데이트
        updateMetrics,
    };
};

/**
 * 간단한 성능 지표만 사용하는 훅
 */
export const useSimplePerformanceMetrics = () => {
    const {metrics, isMonitoring} = usePerformanceMonitor({
        enabled: true,
        enableAlerts: false,
        enableDetailedLogging: false,
        monitoringInterval: 60000, // 1분
    });

    return {
        cacheHitRate: metrics.cacheHitRate,
        totalCacheSize: metrics.totalCacheSize,
        averageResponseTime: metrics.averageResponseTime,
        isMonitoring,
    };
};
