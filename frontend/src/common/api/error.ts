/**
 * FE 공용 API 오류 타입 (WP-01).
 *
 * 인증/구독/채용/NFC 화면 등에 반복되던 오류 메시지 추출 로직(F-05)을 이 한 곳으로 모은다.
 * 화면/훅은 axios 에러 형태를 직접 파싱하지 말고 toApiError()를 거쳐야 한다.
 */
import type {ApiErrorPayload} from './types';

export class ApiError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly raw?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = payload.status;
    this.errorCode = payload.errorCode;
    this.raw = payload.raw;
  }
}

interface AxiosLikeError {
  isAxiosError?: boolean;
  message?: string;
  response?: {
    status?: number;
    data?: {message?: string; errorCode?: string; code?: string};
  };
}

const isAxiosLikeError = (error: unknown): error is AxiosLikeError =>
  !!error && typeof error === 'object' && (error as AxiosLikeError).isAxiosError === true;

/** 임의의 에러(axios 에러/일반 Error/그 밖의 값)를 항상 ApiError로 정규화한다. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isAxiosLikeError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const message = data?.message ?? error.message ?? '요청을 처리하지 못했어요.';
    const errorCode = data?.errorCode ?? data?.code;
    return new ApiError({status, errorCode, message, raw: error});
  }

  if (error instanceof Error) {
    return new ApiError({message: error.message, raw: error});
  }

  return new ApiError({message: '알 수 없는 오류가 발생했어요.', raw: error});
}
