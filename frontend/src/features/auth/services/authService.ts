import api from '../../../common/utils/api';
import TokenManager from '../../../services/TokenManager';
import {logger} from '../../../utils/logger';

/**
 * 인증 서비스
 * 로그인/회원가입/토큰 관리/사용자 조회를 담당
 */

// 사용자 타입
export interface User {
    id:  number;
    name: string;
    email: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL';
}

// 로그인 요청 타입
export interface LoginRequest {
    email: string;
    password: string;
}

// 회원가입 요청 타입
export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL';
}

// 인증 응답 타입 (앱 내부 표준)
export interface AuthResponse {
    user: User;
    token: string; // accessToken
}

// 서버 응답을 내부 표준으로 변환
const mapAuthResponse = async (data: any): Promise<AuthResponse> => {
    const root = data?.data && data?.message !== undefined ? data.data : data; // ApiResponse 래핑 대비
    const accessToken = root?.accessToken ?? root?.token ?? root?.jwtToken;
    const refreshToken = root?.refreshToken;
    const user: User = root?.user ?? {
        id: root?.userId ?? 'unknown',
        name: root?.name ?? root?.user?.name ?? '',
        email: root?.email ?? root?.user?.email ?? '',
        roles: root?.roles,
        role: (root?.userGrade) || undefined,
    };

    if (!accessToken) {throw new Error('INVALID_LOGIN_RESPONSE');}
    if (refreshToken) {
        await TokenManager.setTokens({ accessToken, refreshToken });
    } else {
        await TokenManager.setAccess(accessToken);
    }
    return { user, token: accessToken };
};

// 엔드포인트 호출 헬퍼 (우선 /api/auth/*, 폴백 404/405 → 레거시)
const postWithFallback = async <T>(primary: string, fallback: string, payload?: any) => {
    try {
        return await api.post<T>(primary, payload);
    } catch (e: any) {
        const code = e?.response?.status;
        if (code === 404 || code === 405) {
            return await api.post<T>(fallback, payload);
        }
        throw e;
    }
};

const getWithFallback = async <T>(primary: string, fallback: string) => {
    try {
        return await api.get<T>(primary);
    } catch (e: any) {
        const code = e?.response?.status;
        if (code === 404 || code === 405) {
            return await api.get<T>(fallback);
        }
        throw e;
    }
};

const authService = {
    // 로그인
    login: async (loginRequest: LoginRequest): Promise<AuthResponse> => {
        try {
            const res = await postWithFallback<any>('/api/login', '/api/login', loginRequest);
            return await mapAuthResponse(res.data);
        } catch (error) {
            logger.error('login failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 카카오 로그인
    kakaoLogin: async (code: string): Promise<AuthResponse> => {
        try {
            const res = await api.get<any>(`/kakao/auth/proc?code=${encodeURIComponent(code)}`);
            return await mapAuthResponse(res.data);
        } catch (error) {
            logger.error('kakaoLogin failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 회원가입
    signup: async (signupRequest: SignupRequest): Promise<AuthResponse> => {
        try {
            const res = await postWithFallback<any>('/api/join', '/api/join', signupRequest);
            // 일부 서버는 회원가입 시 토큰을 반환하지 않을 수 있음 → 토큰 없으면 mapAuthResponse가 access만 저장
            return await mapAuthResponse(res.data);
        } catch (error) {
            logger.error('signup failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 로그아웃 (서버 통지 + 로컬 정리)
    logout: async (): Promise<void> => {
        try {
            const refreshToken = await TokenManager.getRefresh();
            if (refreshToken) {
                try {
                    await postWithFallback<any>('/api/auth/logout', '/api/logout', { refreshToken });
                } catch (_) {
                    // ignore network errors
                }
            }
        } finally {
            await TokenManager.clear();
        }
    },

    // 현재 사용자 정보
    getCurrentUser: async (): Promise<User> => {
        try {
            const res = await getWithFallback<User>('/api/auth/me', '/api/me');
            return (res.data as unknown) as User;
        } catch (error) {
            logger.error('getCurrentUser failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 비밀번호 재설정 요청
    requestPasswordReset: async (email: string): Promise<void> => {
        try {
            await postWithFallback('/api/auth/password/reset/request', '/api/password-reset-request', { email });
        } catch (error) {
            logger.error('requestPasswordReset failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 비밀번호 재설정
    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        try {
            await postWithFallback('/api/auth/password/reset', '/api/password-reset', { token, newPassword });
        } catch (error) {
            logger.error('resetPassword failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    // 인증 상태 확인
    isAuthenticated: async (): Promise<boolean> => {
        const token = await TokenManager.getAccess();
        return !!token;
    },
};

export default authService;
