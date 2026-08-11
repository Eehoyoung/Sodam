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

/**
 * 화면에 바로 보여줄 수 있는 오류 메시지 — toApiError의 message를 그대로 노출한다.
 *
 * <p>{@code fallback} 을 주면 <b>서버가 message 를 내려준 경우에만</b> 그 값을 쓰고, 아니면
 * 화면별 문구를 쓴다. `catch (e: unknown) { getErrorMessage(e, '저장 실패') }` 로 흩어져
 * 있던 관용구를 타입 안전하게 대체하려는 것이다 — {@code e} 를 {@code any} 로 두면 오타
 * (`e.reponse`)가 조용히 undefined 가 되어 항상 fallback 만 나온다.</p>
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  const {message} = toApiError(error);
  if (fallback === undefined) {
    return message;
  }
  return hasServerMessage(error) ? message : fallback;
}

/** 서버가 응답 본문에 message 를 실어 보냈는지. */
function hasServerMessage(error: unknown): boolean {
  return isAxiosLikeError(error) && typeof error.response?.data?.message === 'string';
}
