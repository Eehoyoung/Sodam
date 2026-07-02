import {QueryClient} from '@tanstack/react-query';

/**
 * TanStack Query 클라이언트 설정
 * 백엔드 Redis 캐싱과 연계한 최적화된 클라이언트 사이드 데이터 관리
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 캐시 전략 설정
            staleTime: 5 * 60 * 1000, // 5분 - 데이터가 신선한 것으로 간주되는 시간
            gcTime: 10 * 60 * 1000, // 10분 - 가비지 컬렉션 시간 (구 cacheTime)

            // 재시도 설정
            retry: 3, // 실패 시 3번까지 재시도
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프

            // 네트워크 및 포커스 관련 설정
            refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 재요청 비활성화
            refetchOnReconnect: true, // 네트워크 재연결 시 자동 재요청
            refetchOnMount: true, // 컴포넌트 마운트 시 재요청

            // 에러 처리
            throwOnError: false, // 에러를 throw하지 않고 상태로 관리

            // 네트워크 모드 설정
            networkMode: 'online', // 온라인일 때만 쿼리 실행
        },
        mutations: {
            // 뮤테이션 재시도 설정
            retry: 1, // 뮤테이션은 1번만 재시도
            retryDelay: 1000, // 1초 후 재시도

            // 네트워크 모드 설정
            networkMode: 'online',

            // 에러 처리
            throwOnError: false,
        },
    },
});

/**
 * 쿼리 키 팩토리
 * 일관된 쿼리 키 생성을 위한 헬퍼 함수들
 */
export const queryKeys = {
    // 인증 관련
    auth: {
        all: ['auth'] as const,
        currentUser: () => [...queryKeys.auth.all, 'currentUser'] as const,
        profile: (userId: string) => [...queryKeys.auth.all, 'profile', userId] as const,
    },

    // 근태 관리 관련
    attendance: {
        all: ['attendance'] as const,
        store: (storeId: number) => [...queryKeys.attendance.all, 'store', storeId] as const,
        employee: (employeeId: number) => [...queryKeys.attendance.all, 'employee', employeeId] as const,
        monthly: (employeeId: number, year: number, month: number) =>
            [...queryKeys.attendance.employee(employeeId), 'monthly', year, month] as const,
    },

    // 급여 관리 관련
    salary: {
        all: ['salary'] as const,
        employee: (employeeId: number, year: number, month: number) =>
            [...queryKeys.salary.all, 'employee', employeeId, year, month] as const,
        store: (storeId: number) => [...queryKeys.salary.all, 'store', storeId] as const,
    },

    // 매장 관리 관련
    store: {
        all: ['store'] as const,
        detail: (storeId: number) => [...queryKeys.store.all, 'detail', storeId] as const,
        employees: (storeId: number) => [...queryKeys.store.all, 'employees', storeId] as const,
        master: (userId: string) => [...queryKeys.store.all, 'master', userId] as const,
    },

    // 정보 서비스 관련
    info: {
        all: ['info'] as const,
        tips: () => [...queryKeys.info.all, 'tips'] as const,
        policies: () => [...queryKeys.info.all, 'policies'] as const,
        labor: () => [...queryKeys.info.all, 'labor'] as const,
    },

    // Q&A 관련
    qna: {
        all: ['qna'] as const,
        questions: () => [...queryKeys.qna.all, 'questions'] as const,
        question: (questionId: number) => [...queryKeys.qna.all, 'question', questionId] as const,
    },
} as const;

/**
 * 캐시 무효화 헬퍼 함수들
 */
export const invalidateQueries = {
    // 인증 관련 캐시 무효화
    auth: () => queryClient.invalidateQueries({queryKey: queryKeys.auth.all}),

    // 근태 관련 캐시 무효화
    attendance: {
        all: () => queryClient.invalidateQueries({queryKey: queryKeys.attendance.all}),
        store: (storeId: number) => queryClient.invalidateQueries({queryKey: queryKeys.attendance.store(storeId)}),
        employee: (employeeId: number) => queryClient.invalidateQueries({queryKey: queryKeys.attendance.employee(employeeId)}),
    },

    // 급여 관련 캐시 무효화
    salary: {
        all: () => queryClient.invalidateQueries({queryKey: queryKeys.salary.all}),
        employee: (employeeId: number) => queryClient.invalidateQueries({
            queryKey: queryKeys.salary.all,
            predicate: (query) => query.queryKey.includes(employeeId)
        }),
    },

    // 매장 관련 캐시 무효화
    store: {
        all: () => queryClient.invalidateQueries({queryKey: queryKeys.store.all}),
        detail: (storeId: number) => queryClient.invalidateQueries({queryKey: queryKeys.store.detail(storeId)}),
    },
};

/**
 * 에러 처리 헬퍼
 */
export const handleQueryError = (error: unknown, context?: string) => {
    console.error(`[TanStack Query Error]${context ? ` ${context}:` : ''}`, error);

    // 에러 타입에 따른 처리 및 표준화된 메시지 매핑(errorCode 우선)
    if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response: { status: number; data?: any } };
        const errorCode: string | undefined = apiError.response?.data?.errorCode || apiError.response?.data?.code;

        if (errorCode) {
            // 표준 에러 메시지 매핑
            const codeMessageMap: Record<string, string> = {
                LOCATION_VERIFICATION_FAILED: '매장 반경 밖입니다.',
                INVALID_TAG: '유효하지 않은 NFC 태그입니다.',
                DUPLICATE_CHECK_IN: '이미 처리된 출근입니다.',
                DUPLICATE_CHECK_OUT: '이미 처리된 퇴근입니다.',
                PERMISSION_DENIED: '권한이 없습니다.',
            };
            const mapped = codeMessageMap[errorCode];
            if (mapped) {
                console.warn(`[TanStack Query] ${mapped}`);
            }
        }

        switch (apiError.response.status) {
            case 401:
                // 인증 오류 - 로그아웃 처리
                invalidateQueries.auth();
                break;
            case 403:
                // 권한 오류
                console.warn('[TanStack Query] 권한이 없습니다.');
                break;
            case 400:
                console.warn('[TanStack Query] 입력 데이터를 확인해주세요.');
                break;
            case 500:
                // 서버 오류
                console.error('[TanStack Query] 서버 오류가 발생했습니다.');
                break;
            default:
                console.error('[TanStack Query] API 오류:', apiError.response.status);
        }
    }
};
