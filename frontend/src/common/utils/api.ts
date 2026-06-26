import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import TokenManager from '../../services/TokenManager';
import {unifiedStorage} from './unifiedStorage';
import {env} from '../config/env';

/**
 * API 클라이언트 설정 및 인터셉터 (Access/Refresh with single-flight queue)
 *
 * 베이스 URL은 `src/common/config/env.ts` 에서 단일 진실로 관리.
 *   - Android 에뮬레이터: http://10.0.2.2:7070
 *   - iOS 시뮬레이터:    http://localhost:7070
 *   - 운영:             https://sodam-api.com
 */

const BASE_URL = env.apiBaseUrl;
if (env.debug) {console.log('[API] BASE_URL =', BASE_URL);}

// API 클라이언트 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: env.apiTimeout,
});

// 요청 인터셉터: Authorization 주입
apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            const accessToken = await TokenManager.getAccess();
            if (accessToken) {
                config.headers.set('Authorization', `Bearer ${accessToken}`);
            }
        } catch (_) {
            // silent
        }

        // 요청 로그 — 개발 빌드에서만, body 제외. (운영에서 로그인 비밀번호 등 PII 노출 방지)
        if (__DEV__) {
            console.log(
                `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
            );
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 401 처리 상태
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];
let onUnauthorized: (() => void) | null = null;

export const setOnUnauthorized = (cb: (() => void) | null) => {
    onUnauthorized = cb;
};

// 402 처리: 플랜이 부족할 때 BE 가 PLAN_REQUIRED 로 거절 → FE 가 페이월을 띄움
export interface PlanRequiredInfo {
    requiredPlan?: string;
    currentPlan?: string;
    message?: string;
}
let onPlanRequired: ((info: PlanRequiredInfo) => void) | null = null;

export const setOnPlanRequired = (
    cb: ((info: PlanRequiredInfo) => void) | null,
) => {
    onPlanRequired = cb;
};

async function refreshAccessToken(): Promise<string> {
    const refreshToken = await TokenManager.getRefresh();
    if (!refreshToken) {throw new Error('NO_REFRESH_TOKEN');}

    // 1차 경로
    try {
        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken }, { timeout: 10000 });
        const newAccess = res.data?.accessToken || res.data?.data?.accessToken;
        const rotatedRefresh = res.data?.refreshToken || res.data?.data?.refreshToken || refreshToken;
        if (!newAccess) {throw new Error('INVALID_REFRESH_RESPONSE');}
        await TokenManager.setTokens({ accessToken: newAccess, refreshToken: rotatedRefresh });
        return newAccess;
    } catch (e: any) {
        // 404/405 등일 경우 폴백 시도
        if (e?.response?.status === 404 || e?.response?.status === 405) {
            const res = await axios.post(`${BASE_URL}/api/refresh`, { refreshToken }, { timeout: 10000 });
            const newAccess = res.data?.accessToken || res.data?.data?.accessToken;
            const rotatedRefresh = res.data?.refreshToken || res.data?.data?.refreshToken || refreshToken;
            if (!newAccess) {throw new Error('INVALID_REFRESH_RESPONSE');}
            await TokenManager.setTokens({ accessToken: newAccess, refreshToken: rotatedRefresh });
            return newAccess;
        }
        throw e;
    }
}

// 응답 인터셉터: 401 처리 및 단일 비행(refresh queue)
// ⚠️ 인증 엔드포인트(/login, /auth/refresh, /refresh, /join)의 401 은 "잘못된 자격증명" 의미.
// refresh 시도하면 진짜 원인(비밀번호 불일치) 이 NO_REFRESH_TOKEN 으로 가려져 UX 가 망가짐.
const AUTH_ENDPOINTS = ['/api/login', '/api/auth/refresh', '/api/refresh', '/api/join', '/api/kakao'];
const isAuthEndpoint = (url?: string) =>
    !!url && AUTH_ENDPOINTS.some(p => url.includes(p));

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
        const original: any = error?.config || {};
        const status = error?.response?.status;

        // 402 PLAN_REQUIRED: 플랜 부족 → 페이월 콜백 호출 후 원본 에러 전파(로직 흐름 유지)
        // BE(ApiResponse)는 `errorCode` 필드로 내려준다. 과거 `code`만 검사해 페이월이 안 떴음.
        if (
            status === 402 &&
            (error?.response?.data?.errorCode === 'PLAN_REQUIRED' ||
                error?.response?.data?.code === 'PLAN_REQUIRED')
        ) {
            if (onPlanRequired) {
                const data = error.response.data;
                onPlanRequired({
                    requiredPlan: data?.data?.requiredPlan,
                    currentPlan: data?.data?.currentPlan,
                    message: data?.message,
                });
            }
            return Promise.reject(error);
        }

        // 인증 엔드포인트는 refresh 우회 — 원본 에러(401/메시지) 그대로 전파
        if (status === 401 && isAuthEndpoint(original?.url)) {
            return Promise.reject(error);
        }

        if (status === 401 && !original._retry) {
            original._retry = true;

            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const newAccess = await refreshAccessToken();
                    refreshQueue.forEach(cb => cb(newAccess));
                    refreshQueue = [];
                    // 재시도 시 Authorization 갱신
                    original.headers = original.headers || {};
                    original.headers.Authorization = `Bearer ${newAccess}`;
                    return apiClient(original);
                } catch (e) {
                    refreshQueue.forEach(cb => cb(null));
                    refreshQueue = [];
                    await TokenManager.clear();
                    try { await unifiedStorage.removeItem('userToken'); } catch (_) { /* empty */ }
                    if (onUnauthorized) {onUnauthorized();}
                    return Promise.reject(e);
                } finally {
                    isRefreshing = false;
                }
            }

            return new Promise((resolve, reject) => {
                refreshQueue.push((token) => {
                    if (!token) {return reject(error);}
                    original.headers = original.headers || {};
                    original.headers.Authorization = `Bearer ${token}`;
                    resolve(apiClient(original));
                });
            });
        }

        return Promise.reject(error);
    }
);

// API 요청 함수들
export const api = {
    get: <T>(url: string, params?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
        apiClient.get<T>(url, { params, ...config }),

    post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
        apiClient.post<T>(url, data, config),

    put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
        apiClient.put<T>(url, data, config),

    delete: <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
        apiClient.delete<T>(url, config),

    patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
        apiClient.patch<T>(url, data, config),
};

export const __testing__ = {
    getClient: () => apiClient,
    reset: () => { /* no-op: variables are reset per test process */ },
};

export default api;
