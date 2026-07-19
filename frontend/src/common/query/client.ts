import {QueryClient} from '@tanstack/react-query';

/**
 * TanStack QueryClient 기본 정책 (WP-05).
 *
 * 이 파일은 클라이언트 인스턴스와 그 기본 옵션만 소유한다. 도메인별 query key factory는
 * WP-05 2단계에서 각 feature hook(및 `common/auth/queryKeys.ts`)로 분리 완료됐다 — 오류 처리는
 * `common/query/errorHandler.ts`를 참고할 것.
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
