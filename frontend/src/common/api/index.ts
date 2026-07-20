/**
 * common/api 공개 진입점 (WP-01). 새 코드는 이 파일(또는 named path `common/api/*`)만
 * import한다 — `common/api/client` 등 내부 파일을 직접 import하지 않는다.
 */
export {default as api, __testing__, setOnPlanRequired} from './client';
export type {PlanRequiredInfo} from './client';

export {ApiError, toApiError} from './error';
export {unwrapData} from './unwrap';
export type {ApiEnvelope, ApiErrorPayload, ApiClient, PageResponse} from './types';
