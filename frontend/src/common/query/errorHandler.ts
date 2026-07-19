/**
 * TanStack Query 오류 처리 공통 헬퍼 (WP-05 2단계).
 *
 * 기존 `common/utils/queryClient.ts`의 `handleQueryError`가 axios 에러 형태를 직접 파싱하던
 * 로직을 `common/api/error.ts`의 `toApiError`로 위임했다(동작 변경 없음 — 여전히 axios 에러가
 * 아니면 아무 것도 하지 않고, 401이면 auth 쿼리 캐시를 무효화한다). 호출부는 이 함수 호출 후에도
 * 여전히 원본 error를 그대로 throw한다 — LoginScreen 등 여러 화면이 `error.response.status`를
 * 직접 읽고 있어(예: `LoginScreen.tsx`의 401/403 분기), 이 함수가 던지는 값의 형태를 바꾸면
 * 그 화면들이 깨진다. 그래서 이 함수는 로깅·부수효과 전용이며 값을 반환하지 않는다.
 */
import {queryClient} from './client';
import {authQueryKeys} from '../auth/queryKeys';
import {toApiError} from '../api/error';

const codeMessageMap: Record<string, string> = {
    LOCATION_VERIFICATION_FAILED: '매장 반경 밖입니다.',
    INVALID_TAG: '유효하지 않은 NFC 태그입니다.',
    DUPLICATE_CHECK_IN: '이미 처리된 출근입니다.',
    DUPLICATE_CHECK_OUT: '이미 처리된 퇴근입니다.',
    PERMISSION_DENIED: '권한이 없습니다.',
};

/**
 * 에러 처리 헬퍼 — TanStack Query mutationFn/queryFn의 catch 블록에서 호출한다.
 */
export const handleQueryError = (error: unknown, context?: string) => {
    console.error(`[TanStack Query Error]${context ? ` ${context}:` : ''}`, error);

    const apiError = toApiError(error);
    // axios 응답이 없는 에러(순수 JS Error 등)는 원래도 상태코드 분기를 타지 않았다.
    if (apiError.status === undefined) {
        return;
    }

    if (apiError.errorCode) {
        const mapped = codeMessageMap[apiError.errorCode];
        if (mapped) {
            console.warn(`[TanStack Query] ${mapped}`);
        }
    }

    switch (apiError.status) {
        case 401:
            queryClient.invalidateQueries({queryKey: authQueryKeys.all});
            break;
        case 403:
            console.warn('[TanStack Query] 권한이 없습니다.');
            break;
        case 400:
            console.warn('[TanStack Query] 입력 데이터를 확인해주세요.');
            break;
        case 500:
            console.error('[TanStack Query] 서버 오류가 발생했습니다.');
            break;
        default:
            console.error('[TanStack Query] API 오류:', apiError.status);
    }
};
