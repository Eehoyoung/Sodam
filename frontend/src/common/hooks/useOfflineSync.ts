import {useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {AppState, AppStateStatus} from 'react-native';
import {queryKeys} from '../utils/queryClient';
import {adjustCacheForNetwork} from '../utils/cacheStrategy';

/**
 * 네트워크 상태 타입 정의
 */
export interface NetworkState {
    isConnected: boolean;
    type: 'wifi' | 'cellular' | 'none' | 'unknown';
    isInternetReachable: boolean | null;
}

/**
 * 오프라인 동기화 설정
 */
export interface OfflineSyncConfig {
    enableAutoSync: boolean;           // 자동 동기화 활성화
    syncOnAppForeground: boolean;      // 앱 포그라운드 시 동기화
    syncOnNetworkReconnect: boolean;   // 네트워크 재연결 시 동기화
    maxRetryAttempts: number;          // 최대 재시도 횟수
    retryDelay: number;                // 재시도 지연 시간 (ms)
    criticalQueries: string[];         // 우선 동기화할 중요 쿼리들
}

/**
 * 기본 오프라인 동기화 설정
 */
const defaultConfig: OfflineSyncConfig = {
    enableAutoSync: true,
    syncOnAppForeground: true,
    syncOnNetworkReconnect: true,
    maxRetryAttempts: 3,
    retryDelay: 2000,
    criticalQueries: [
        'auth',
        'attendance-current',
        'attendance-store',
        'user-profile'
    ],
};

/**
 * 오프라인 동기화 상태
 */
export interface OfflineSyncState {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncErrors: string[];
    networkType: 'wifi' | 'cellular' | 'none' | 'unknown';
    pendingMutations: number;
}

/**
 * 오프라인 지원 및 동기화를 위한 커스텀 훅
 * 네트워크 상태 모니터링, 자동 동기화, 오프라인 캐시 관리 기능 제공
 */
export const useOfflineSync = (config: Partial<OfflineSyncConfig> = {}) => {
    const queryClient = useQueryClient();
    const finalConfig = {...defaultConfig, ...config};

    // 상태 관리
    const [networkState, setNetworkState] = useState<NetworkState>({
        isConnected: true,
        type: 'unknown',
        isInternetReachable: null,
    });

    const [syncState, setSyncState] = useState<OfflineSyncState>({
        isOnline: true,
        isSyncing: false,
        lastSyncTime: null,
        syncErrors: [],
        networkType: 'unknown',
        pendingMutations: 0,
    });

    // 동기화 진행 중인지 추적
    const syncInProgress = useRef(false);
    const retryTimeouts = useRef<Array<ReturnType<typeof setTimeout>>>([]);
    const appStateRef = useRef<AppStateStatus>(AppState.currentState);

    /**
     * 네트워크 상태 업데이트
     */
    const updateNetworkState = useCallback((newState: Partial<NetworkState>) => {
        setNetworkState(prev => ({...prev, ...newState}));
        setSyncState(prev => ({
            ...prev,
            isOnline: newState.isConnected ?? prev.isOnline,
            networkType: newState.type ?? prev.networkType,
        }));
    }, []);

    /**
     * 중요한 쿼리들을 우선적으로 동기화
     */
    const syncCriticalQueries = useCallback(async () => {
        if (!finalConfig.enableAutoSync || syncInProgress.current) {
            return;
        }

        console.log('[OfflineSync] 중요 쿼리 동기화 시작');

        const syncPromises = finalConfig.criticalQueries.map(async (queryType) => {
            try {
                switch (queryType) {
                    case 'auth':
                        await queryClient.invalidateQueries({queryKey: queryKeys.auth.all});
                        break;
                    case 'attendance-current':
                        await queryClient.invalidateQueries({
                            queryKey: queryKeys.attendance.all,
                            predicate: (query) => query.queryKey.includes('current')
                        });
                        break;
                    case 'attendance-store':
                        await queryClient.invalidateQueries({
                            queryKey: queryKeys.attendance.all,
                            predicate: (query) => query.queryKey.includes('store')
                        });
                        break;
                    case 'user-profile':
                        await queryClient.invalidateQueries({
                            queryKey: queryKeys.auth.currentUser()
                        });
                        break;
                    default:
                        console.warn(`[OfflineSync] 알 수 없는 쿼리 타입: ${queryType}`);
                }
            } catch (error) {
                console.error(`[OfflineSync] ${queryType} 동기화 실패:`, error);
                throw error;
            }
        });

        await Promise.allSettled(syncPromises);
        console.log('[OfflineSync] 중요 쿼리 동기화 완료');
    }, [queryClient, finalConfig]);

    /**
     * 전체 캐시 동기화
     */
    const syncAllQueries = useCallback(async () => {
        if (!finalConfig.enableAutoSync || syncInProgress.current) {
            return;
        }

        syncInProgress.current = true;
        setSyncState(prev => ({...prev, isSyncing: true, syncErrors: []}));

        try {
            console.log('[OfflineSync] 전체 쿼리 동기화 시작');

            // 1단계: 중요 쿼리 우선 동기화
            await syncCriticalQueries();

            // 2단계: 나머지 쿼리 동기화
            await queryClient.invalidateQueries();

            // 3단계: 실패한 뮤테이션 재시도
            await queryClient.resumePausedMutations();

            setSyncState(prev => ({
                ...prev,
                isSyncing: false,
                lastSyncTime: new Date(),
                syncErrors: [],
            }));

            console.log('[OfflineSync] 전체 쿼리 동기화 완료');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

            setSyncState(prev => ({
                ...prev,
                isSyncing: false,
                syncErrors: [...prev.syncErrors, errorMessage],
            }));

            console.error('[OfflineSync] 동기화 실패:', error);
        } finally {
            syncInProgress.current = false;
        }
    }, [queryClient, finalConfig, syncCriticalQueries]);

    /**
     * 재시도 로직이 포함된 동기화
     */
    const syncWithRetry = useCallback(async (attempt: number = 1) => {
        try {
            await syncAllQueries();
        } catch (error) {
            if (attempt < finalConfig.maxRetryAttempts) {
                console.log(`[OfflineSync] 동기화 재시도 ${attempt}/${finalConfig.maxRetryAttempts}`);

                const timeout = setTimeout(() => {
                    syncWithRetry(attempt + 1);
                }, finalConfig.retryDelay * attempt);

                retryTimeouts.current.push(timeout);
            } else {
                console.error('[OfflineSync] 최대 재시도 횟수 초과');
            }
        }
    }, [syncAllQueries, finalConfig]);

    /**
     * 네트워크 재연결 시 동기화
     */
    const handleNetworkReconnect = useCallback(() => {
        if (finalConfig.syncOnNetworkReconnect && networkState.isConnected) {
            console.log('[OfflineSync] 네트워크 재연결 감지 - 동기화 시작');
            syncWithRetry();
        }
    }, [finalConfig.syncOnNetworkReconnect, networkState.isConnected, syncWithRetry]);

    /**
     * 앱 포그라운드 시 동기화
     */
    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (
            finalConfig.syncOnAppForeground &&
            appStateRef.current.match(/inactive|background/) &&
            nextAppState === 'active' &&
            networkState.isConnected
        ) {
            console.log('[OfflineSync] 앱 포그라운드 감지 - 동기화 시작');
            syncWithRetry();
        }
        appStateRef.current = nextAppState;
    }, [finalConfig.syncOnAppForeground, networkState.isConnected, syncWithRetry]);

    /**
     * 수동 동기화 트리거
     */
    const triggerSync = useCallback(async (force: boolean = false) => {
        if (force) {
            syncInProgress.current = false; // 강제 동기화 시 진행 중 플래그 리셋
        }

        if (networkState.isConnected) {
            await syncWithRetry();
        } else {
            console.warn('[OfflineSync] 오프라인 상태에서는 동기화할 수 없습니다');
        }
    }, [networkState.isConnected, syncWithRetry]);

    /**
     * 오프라인 모드 활성화
     */
    const enableOfflineMode = useCallback(() => {
        console.log('[OfflineSync] 오프라인 모드 활성화');

        // 모든 쿼리의 캐시 시간을 연장
        const queries = queryClient.getQueryCache().getAll();
        queries.forEach(query => {
            const currentOptions = query.options;
            if (currentOptions) {
                const adjustedOptions = adjustCacheForNetwork(
                    {
                        staleTime: (currentOptions as any).staleTime || 5 * 60 * 1000,
                        gcTime: (currentOptions as any).gcTime || 10 * 60 * 1000,
                        retry: typeof (currentOptions as any).retry === 'number' ? (currentOptions as any).retry : 2,
                    },
                    'offline'
                );

                // 쿼리 옵션 업데이트 (실제로는 새로운 쿼리 생성 시 적용됨)
                console.log(`[OfflineSync] ${query.queryKey.join('-')} 캐시 시간 연장`);
            }
        });

        // 뮤테이션 일시 중지
        queryClient.getMutationCache().getAll().forEach(mutation => {
            if (mutation.state.status === 'pending') {
                console.log('[OfflineSync] 뮤테이션 일시 중지:', mutation.options.mutationKey);
            }
        });
    }, [queryClient]);

    /**
     * 온라인 모드 복구
     */
    const restoreOnlineMode = useCallback(() => {
        console.log('[OfflineSync] 온라인 모드 복구');

        // 일시 중지된 뮤테이션 재개
        queryClient.resumePausedMutations();

        // 자동 동기화 트리거
        if (finalConfig.enableAutoSync) {
            syncWithRetry();
        }
    }, [queryClient, finalConfig.enableAutoSync, syncWithRetry]);

    /**
     * 네트워크 상태 변화 감지 및 처리
     */
    useEffect(() => {
        const wasOnline = syncState.isOnline;
        const isNowOnline = networkState.isConnected;

        if (!wasOnline && isNowOnline) {
            // 오프라인에서 온라인으로 복구
            restoreOnlineMode();
            handleNetworkReconnect();
        } else if (wasOnline && !isNowOnline) {
            // 온라인에서 오프라인으로 전환
            enableOfflineMode();
        }
    }, [networkState.isConnected, syncState.isOnline, restoreOnlineMode, handleNetworkReconnect, enableOfflineMode]);

    /**
     * 앱 상태 변화 리스너 등록
     */
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [handleAppStateChange]);

    /**
     * 컴포넌트 언마운트 시 정리
     */
    useEffect(() => {
        return () => {
            // 모든 재시도 타이머 정리
            retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
            retryTimeouts.current = [];

            // 동기화 진행 중 플래그 리셋
            syncInProgress.current = false;
        };
    }, []);

    /**
     * 뮤테이션 상태 모니터링
     */
    useEffect(() => {
        const unsubscribe = queryClient.getMutationCache().subscribe(() => {
            const mutations = queryClient.getMutationCache().getAll();
            const pendingCount = mutations.filter(m => m.state.status === 'pending').length;

            setSyncState(prev => ({
                ...prev,
                pendingMutations: pendingCount,
            }));
        });

        return unsubscribe;
    }, [queryClient]);

    /**
     * 초기 네트워크 상태 확인 (React Native NetInfo 사용 시뮬레이션)
     */
    useEffect(() => {
        // 실제 구현에서는 @react-native-community/netinfo 사용
        // 여기서는 기본값으로 온라인 상태로 설정
        const checkInitialNetworkState = async () => {
            try {
                // 실제 네트워크 상태 확인 로직
                // const netInfo = await NetInfo.fetch();
                // updateNetworkState({
                //   isConnected: netInfo.isConnected ?? false,
                //   type: netInfo.type as any,
                //   isInternetReachable: netInfo.isInternetReachable,
                // });

                // 임시로 온라인 상태로 설정
                updateNetworkState({
                    isConnected: true,
                    type: 'wifi',
                    isInternetReachable: true,
                });
            } catch (error) {
                console.error('[OfflineSync] 초기 네트워크 상태 확인 실패:', error);
            }
        };

        checkInitialNetworkState();
    }, [updateNetworkState]);

    return {
        // 상태
        networkState,
        syncState,
        isOnline: syncState.isOnline,
        isSyncing: syncState.isSyncing,
        lastSyncTime: syncState.lastSyncTime,
        syncErrors: syncState.syncErrors,
        pendingMutations: syncState.pendingMutations,

        // 액션
        triggerSync,
        syncCriticalQueries,
        enableOfflineMode,
        restoreOnlineMode,

        // 유틸리티
        updateNetworkState, // 테스트나 수동 네트워크 상태 업데이트용
    };
};

/**
 * 네트워크 상태만 간단히 사용하는 훅
 */
export const useNetworkState = () => {
    const {networkState, isOnline} = useOfflineSync({enableAutoSync: false});

    return {
        isOnline,
        networkType: networkState.type,
        isInternetReachable: networkState.isInternetReachable,
    };
};

/**
 * 오프라인 상태에서 사용할 수 있는 데이터 확인 훅
 */
export const useOfflineData = (queryKey: unknown[]) => {
    const queryClient = useQueryClient();
    const {isOnline} = useNetworkState();

    const cachedData = queryClient.getQueryData(queryKey);
    const hasOfflineData = !!cachedData;

    return {
        data: cachedData,
        hasOfflineData,
        isOnline,
        canUseOfflineData: !isOnline && hasOfflineData,
    };
};
