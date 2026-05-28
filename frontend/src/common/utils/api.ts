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
if (env.debug) console.log('[API] BASE_URL =', BASE_URL);

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

        // 요청 URL과 메서드 로그
        console.log(
            `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
            config.params || config.data || ''
        );

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
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
        const original: any = error?.config || {};
        const status = error?.response?.status;

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
                    original.headers['Authorization'] = `Bearer ${newAccess}`;
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
                    original.headers['Authorization'] = `Bearer ${token}`;
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
