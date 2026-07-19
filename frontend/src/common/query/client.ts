import {QueryClient} from '@tanstack/react-query';

/**
 * TanStack QueryClient 기본 정책 (WP-05).
 *
 * 이 파일은 클라이언트 인스턴스와 그 기본 옵션만 소유한다 — 도메인별 query key factory와
 * invalidate 헬퍼는 아직 `common/utils/queryClient.ts`에 남아있다(여러 feature hook이
 * 이미 참조 중이라, 기능별 소유로 쪼개는 작업은 hook 전수 이관과 함께 별도 증분으로 다룬다).
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: true,
            throwOnError: false,
            networkMode: 'online',
        },
        mutations: {
            retry: 1,
            retryDelay: 1000,
            networkMode: 'online',
            throwOnError: false,
        },
    },
});
