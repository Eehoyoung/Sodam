import api from '../../../common/utils/api';
import TokenManager from '../../../services/TokenManager';
import {logger} from '../../../utils/logger';

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role?: 'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL';
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
    const user: User = root?.user ?? {
        id: root?.userId,
        name: root?.name ?? '',
        email: root?.email ?? '',
        role: mapRole(root?.userGrade),
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
        try {
            const refreshToken = await TokenManager.getRefresh();
            if (refreshToken) {
                try {
                    await postWithFallback<any>('/api/auth/logout', '/api/logout', {refreshToken});
                } catch (_) {
                    // ignore network errors
                }
            }
        } finally {
            await TokenManager.clear();
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
        } catch (error) {
            logger.error('getCurrentUser failed', 'AUTH_SERVICE', error);
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
        const token = await TokenManager.getAccess();
        return !!token;
    },
};

export default authService;
