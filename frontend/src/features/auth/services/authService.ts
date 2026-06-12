import api from '../../../common/utils/api';
import TokenManager from '../../../services/TokenManager';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {logger} from '../../../utils/logger';

/**
 * Base64URL → 일반 base64 → 디코딩.
 * JWT payload(중간 세그먼트)는 base64url 인코딩 — atob 가 일반 base64만 다룸.
 * RN 환경에서 atob 호환되며, padding 부족분(`==`)도 보정한다.
 */
const decodeBase64Url = (input: string): string => {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    // global.atob 가 RN 0.71+ 에 내장
    return (global as any).atob(normalized + pad);
};

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL';
    /**
     * 회원가입 후 ProfileBasics 보강 여부.
     * false 면 로그인 직후 ProfileBasicsScreen 으로 강제 진입.
     */
    profileCompleted?: boolean;
    /**
     * 필수 약관(이용약관·개인정보·만14세) 동의 완료 여부.
     * false 면(소셜 가입 등) 로그인 직후 ConsentScreen 으로 강제 진입 (PIPA §22, G-2).
     */
    consentCompleted?: boolean;
    /** 위치정보 동의 여부 — GPS 출퇴근 진입 가능 판정 (위치정보법 §18, G-1). */
    locationConsented?: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL';
    ageConfirmed: boolean;
    termsAgreed: boolean;
    privacyAgreed: boolean;
    marketingAgreed?: boolean;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface SignupResponse {
    message?: string;
    success?: boolean;
}

const mapRole = (value: unknown): User['role'] | undefined => {
    if (typeof value !== 'string') {
        return undefined;
    }
    if (value === 'ROLE_MASTER') {
        return 'MASTER';
    }
    if (value === 'ROLE_EMPLOYEE') {
        return 'EMPLOYEE';
    }
    if (value === 'ROLE_MANAGER') {
        return 'MANAGER';
    }
    if (value === 'ROLE_PERSONAL' || value === 'Personal') {
        return 'PERSONAL';
    }
    return value as User['role'];
};

const mapSignupGrade = (role: SignupRequest['role']) => {
    if (role === 'MASTER' || role === 'MANAGER' || role === 'EMPLOYEE') {
        return role;
    }
    return 'Personal';
};

const mapAuthResponse = async (data: any): Promise<AuthResponse> => {
    const root = data?.data && data?.message !== undefined ? data.data : data;
    const accessToken = root?.accessToken ?? root?.token ?? root?.jwtToken;
    const refreshToken = root?.refreshToken;
    const rawUser = root?.user;
    const user: User = {
        ...(rawUser ?? {}),
        id: rawUser?.id ?? root?.userId,
        name: rawUser?.name ?? root?.name ?? '',
        email: rawUser?.email ?? root?.email ?? '',
        phone: rawUser?.phone ?? root?.phone ?? undefined,
        role: mapRole(rawUser?.role ?? rawUser?.userGrade ?? root?.role ?? root?.userGrade),
        profileCompleted: rawUser?.profileCompleted ?? root?.profileCompleted,
        consentCompleted: rawUser?.consentCompleted ?? root?.consentCompleted,
        locationConsented: rawUser?.locationConsented ?? root?.locationConsented,
    };

    if (!accessToken) {
        throw new Error('INVALID_LOGIN_RESPONSE');
    }
    if (refreshToken) {
        await TokenManager.setTokens({accessToken, refreshToken});
    } else {
        await TokenManager.setAccess(accessToken);
    }
    return {user, token: accessToken};
};

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
    login: async (loginRequest: LoginRequest): Promise<AuthResponse> => {
        try {
            const res = await postWithFallback<any>('/api/login', '/api/login', loginRequest);
            return await mapAuthResponse(res.data);
        } catch (error) {
            logger.error('login failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    kakaoLogin: async (code: string): Promise<AuthResponse> => {
        try {
            const res = await api.get<any>(`/kakao/auth/proc?code=${encodeURIComponent(code)}`);
            return await mapAuthResponse(res.data);
        } catch (error) {
            logger.error('kakaoLogin failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    signup: async (signupRequest: SignupRequest): Promise<SignupResponse> => {
        try {
            const body = {
                name: signupRequest.name,
                email: signupRequest.email,
                password: signupRequest.password,
                phone: signupRequest.phone,
                userGrade: mapSignupGrade(signupRequest.role),
                ageConfirmed: !!signupRequest.ageConfirmed,
                termsAgreed: !!signupRequest.termsAgreed,
                privacyAgreed: !!signupRequest.privacyAgreed,
                marketingAgreed: !!signupRequest.marketingAgreed,
            };
            const res = await postWithFallback<any>('/api/join', '/api/join', body);
            return {
                message: res.data?.message,
                success: res.data?.success,
            };
        } catch (error) {
            logger.error('signup failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    logout: async (): Promise<void> => {
        // 로그아웃 약속: BE 호출 실패해도 로컬은 반드시 깨끗하게.
        // - access/refresh 토큰 (TokenManager 영역)
        // - 레거시 'userToken' 키 (구버전 호환)
        // - 가입 후 잔여 'pendingPurposeAfterSignup'
        try {
            const refreshToken = await TokenManager.getRefresh();
            if (refreshToken) {
                try {
                    await postWithFallback<any>('/api/auth/logout', '/api/logout', {refreshToken});
                } catch (_) {
                    // ignore network errors — 로컬 세션은 무조건 정리
                }
            }
        } finally {
            await TokenManager.clear();
            await Promise.all([
                unifiedStorage.removeItem('userToken').catch(() => {/* ignore */}),
                unifiedStorage.removeItem('pendingPurposeAfterSignup').catch(() => {/* ignore */}),
            ]);
        }
    },

    getCurrentUser: async (): Promise<User> => {
        try {
            const res = await getWithFallback<any>('/api/auth/me', '/api/me');
            const data = res.data?.data ?? res.data;
            return {
                ...data,
                role: mapRole(data?.role ?? data?.userGrade),
            };
        } catch (error: any) {
            // 401/403/404 는 정상적인 미인증/엔드포인트 미존재 상태 — LogBox 도배 방지 위해 silent
            const status = error?.response?.status;
            if (status !== 401 && status !== 403 && status !== 404) {
                logger.error('getCurrentUser failed', 'AUTH_SERVICE', error);
            }
            throw error;
        }
    },

    requestPasswordReset: async (email: string): Promise<void> => {
        try {
            await postWithFallback('/api/auth/password/reset/request', '/api/password-reset-request', {email});
        } catch (error) {
            logger.error('requestPasswordReset failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    resetPassword: async (token: string, newPassword: string): Promise<void> => {
        try {
            await postWithFallback('/api/auth/password/reset', '/api/password-reset', {token, newPassword});
        } catch (error) {
            logger.error('resetPassword failed', 'AUTH_SERVICE', error);
            throw error;
        }
    },

    isAuthenticated: async (): Promise<boolean> => {
        const tokens = await TokenManager.getTokens();
        const token = tokens?.accessToken ?? await TokenManager.getAccess();
        if (!token) {
            return false;
        }
        // JWT 만료 시점 검증 — payload.exp(unix sec) 가 현재보다 작으면 false.
        // 만료된 토큰을 살아있다고 잘못 판정하면 메인 진입 후 첫 API 호출에서 401 → refresh 흐름.
        // 여기서 미리 false 반환하면 자동 로그인 흐름이 즉시 refresh 시도(또는 로그인 화면) 로 분기.
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return true; // 형식 깨졌으면 일단 사용 시도 (서버가 판정)
            }
            const payload = JSON.parse(
                decodeBase64Url(parts[1]),
            );
            if (typeof payload?.exp !== 'number') {
                return true;
            }
            const nowSec = Math.floor(Date.now() / 1000);
            return payload.exp > nowSec;
        } catch (_) {
            return true; // 파싱 실패 → 서버 판정에 위임
        }
    },
};

export default authService;
