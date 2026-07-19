/**
 * @deprecated queryClient 인스턴스 자체의 구현은 `common/query/client.ts`로 이동했다(WP-05).
 * 이 파일은 도메인별 query key factory(`queryKeys`)와 invalidate 헬퍼를 계속 소유한다 —
 * 여러 feature hook이 이미 이 경로에서 import하고 있어(WP-05 완료 조건 중 "기능별 key 소유"는
 * 후속 증분), 지금은 queryClient 인스턴스만 새 경로로 재-export한다.
 */
import {queryClient} from '../query/client';
export {queryClient};

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
        nfcTags: (storeId: number) => [...queryKeys.store.all, 'nfcTags', storeId] as const,
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

    // 인증채용(구직) 관련 — 260711_작업통합.md Part 2
    recruitment: {
        all: ['recruitment'] as const,
        me: () => [...queryKeys.recruitment.all, 'me'] as const,
        store: (storeId: number) => [...queryKeys.recruitment.all, 'store', storeId] as const,
        // Phase 4 — 사장 리스트(유형 필터별로 캐시 분리, §7.4)
        storeSeekers: (storeId: number, workType?: string) =>
            [...queryKeys.recruitment.all, 'store', storeId, 'seekers', workType ?? 'ALL'] as const,
        // Phase 6 — 매칭 왕복(제안·공고·지원, §15·§19)
        myOffers: () => [...queryKeys.recruitment.all, 'myOffers'] as const,
        myPosting: (storeId: number) => [...queryKeys.recruitment.all, 'myPosting', storeId] as const,
        nearbyPostings: (workType?: string, category?: string) =>
            [...queryKeys.recruitment.all, 'nearbyPostings', workType ?? 'ALL', category ?? 'ALL'] as const,
        myApplications: () => [...queryKeys.recruitment.all, 'myApplications'] as const,
        storeApplications: (storeId: number) =>
            [...queryKeys.recruitment.all, 'storeApplications', storeId] as const,
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
