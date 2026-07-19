/**
 * FE 공용 API 계층의 타입 정의 (WP-01).
 *
 * BE `com.rich.sodam.dto.response.ApiResponse<T>` 와 필드를 맞춘다 — success/data/message/
 * errorCode/timestamp. 모든 BE 응답이 이 envelope를 쓰는 것은 아니므로(§F-02, 서비스마다
 * res.data/res.data.data를 제각각 해석) unwrapData()로 두 형태를 모두 흡수한다.
 */
import type {AxiosRequestConfig, AxiosResponse} from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
  timestamp?: string;
}

export interface ApiErrorPayload {
  status?: number;
  errorCode?: string;
  message: string;
  raw?: unknown;
}

/** Spring Data `Page<T>` 응답 형태 — 페이지네이션이 필요한 엔드포인트(예: /api/policy-info/paged)용. */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ApiClient {
  get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}
