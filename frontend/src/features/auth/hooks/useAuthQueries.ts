import React from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import authService, {AuthResponse, LoginRequest, SignupRequest, SignupResponse, User} from '../services/authService';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';

// axios 에러에서 HTTP 상태코드만 안전하게 추출 (인증·존재 에러 분기용).
const statusOf = (error: unknown): number | undefined =>
    (error as {response?: {status?: number}})?.response?.status;

export const useCurrentUser = () => {
    return useQuery({
        queryKey: queryKeys.auth.currentUser(),
        queryFn: async (): Promise<User> => {
            try {
                return await authService.getCurrentUser();
            } catch (error: unknown) {
                // 401/403/404 는 정상 미인증/엔드포인트 미존재 — handleQueryError(LogBox 노출) 호출 안 함
                const status = statusOf(error);
                if (status !== 401 && status !== 403 && status !== 404) {
                    handleQueryError(error, 'getCurrentUser');
                }
                throw error;
            }
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        enabled: false,
        retry: (failureCount, error: unknown) => {
            const status = statusOf(error);
            // 인증·존재 에러는 재시도해도 같은 결과 — 즉시 중단 (LogBox 폴링 방지)
            if (status === 401 || status === 403 || status === 404) {
                return false;
            }
            return failureCount < 3;
        },
        // 키보드 포커스 변경 등으로 자동 재호출 방지 (login 직후만 명시 refetch)
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        meta: {
            errorMessage: '사용자 정보를 가져오지 못했습니다.',
        },
    });
};

export const useAuthStatus = () => {
    return useQuery({
        queryKey: queryKeys.auth.all,
        queryFn: async (): Promise<boolean> => {
            try {
                return await authService.isAuthenticated();
            } catch (error) {
                handleQueryError(error, 'isAuthenticated');
                return false;
            }
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnMount: true,
        // 입력 포커스 변경/네트워크 재연결마다 폴링 → /api/auth/me 도배 → LogBox 도배.
        // staleTime 5분 안에는 캐시 신뢰, 명시적 refetch 만 허용.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 0,
        meta: {
            errorMessage: '인증 상태 확인에 실패했습니다.',
        },
    });
};

const cacheAuthenticatedUser = (queryClient: ReturnType<typeof useQueryClient>, data: AuthResponse) => {
    queryClient.setQueryData(queryKeys.auth.currentUser(), data.user);
    queryClient.setQueryData(queryKeys.auth.all, true);
    queryClient.invalidateQueries({
        queryKey: queryKeys.auth.all,
        exact: false,
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (loginRequest: LoginRequest): Promise<AuthResponse> => {
            try {
                return await authService.login(loginRequest);
            } catch (error) {
                handleQueryError(error, 'login');
                throw error;
            }
        },
        onSuccess: (data: AuthResponse) => {
            cacheAuthenticatedUser(queryClient, data);
            console.log('[TanStack Query] Login success - auth cache updated');
        },
        onError: (error: unknown) => {
            queryClient.removeQueries({queryKey: queryKeys.auth.all});
            console.error('[TanStack Query] Login failed:', error);
        },
        meta: {
            errorMessage: '로그인에 실패했습니다.',
        },
    });
};

export const useKakaoLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (code: string): Promise<AuthResponse> => {
            try {
                return await authService.kakaoLogin(code);
            } catch (error) {
                handleQueryError(error, 'kakaoLogin');
                throw error;
            }
        },
        onSuccess: (data: AuthResponse) => {
            cacheAuthenticatedUser(queryClient, data);
            console.log('[TanStack Query] Kakao login success - auth cache updated');
        },
        onError: (error: unknown) => {
            queryClient.removeQueries({queryKey: queryKeys.auth.all});
            console.error('[TanStack Query] Kakao login failed:', error);
        },
        meta: {
            errorMessage: '카카오 로그인에 실패했습니다.',
        },
    });
};

export const useSignup = () => {
    return useMutation({
        mutationFn: async (signupRequest: SignupRequest): Promise<SignupResponse> => {
            try {
                return await authService.signup(signupRequest);
            } catch (error) {
                handleQueryError(error, 'signup');
                throw error;
            }
        },
        onSuccess: () => {
            console.log('[TanStack Query] Signup success');
        },
        onError: (error: unknown) => {
            console.error('[TanStack Query] Signup failed:', error);
        },
        meta: {
            errorMessage: '회원가입에 실패했습니다.',
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            try {
                await authService.logout();
            } catch (error) {
                handleQueryError(error, 'logout');
            }
        },
        onSuccess: () => {
            queryClient.clear();
            console.log('[TanStack Query] Logout complete - cache cleared');
        },
        onError: (error: unknown) => {
            queryClient.clear();
            console.error('[TanStack Query] Logout failed:', error);
        },
        meta: {
            errorMessage: '로그아웃 처리 중 오류가 발생했습니다.',
        },
    });
};

export const usePasswordResetRequest = () => {
    return useMutation({
        mutationFn: async (email: string): Promise<void> => {
            try {
                await authService.requestPasswordReset(email);
            } catch (error) {
                handleQueryError(error, 'requestPasswordReset');
                throw error;
            }
        },
        onSuccess: () => {
            console.log('[TanStack Query] Password reset request complete');
        },
        onError: (error: unknown) => {
            console.error('[TanStack Query] Password reset request failed:', error);
        },
        meta: {
            errorMessage: '비밀번호 재설정 요청에 실패했습니다.',
        },
    });
};

export const usePasswordReset = () => {
    return useMutation({
        mutationFn: async ({token, newPassword}: { token: string; newPassword: string }): Promise<void> => {
            try {
                await authService.resetPassword(token, newPassword);
            } catch (error) {
                handleQueryError(error, 'resetPassword');
                throw error;
            }
        },
        onSuccess: () => {
            console.log('[TanStack Query] Password reset complete');
        },
        onError: (error: unknown) => {
            console.error('[TanStack Query] Password reset failed:', error);
        },
        meta: {
            errorMessage: '비밀번호 재설정에 실패했습니다.',
        },
    });
};

export const useAuthState = () => {
    const authStatusQuery = useAuthStatus();
    const currentUserQuery = useCurrentUser();

    const currentUserRefetch = currentUserQuery.refetch;
    React.useEffect(() => {
        if (authStatusQuery.data === true) {
            currentUserRefetch();
        }
    }, [authStatusQuery.data, currentUserRefetch]);

    return {
        isAuthenticated: authStatusQuery.data ?? false,
        user: currentUserQuery.data ?? null,
        isLoading: authStatusQuery.isLoading || currentUserQuery.isLoading,
        error: authStatusQuery.error ?? currentUserQuery.error,
        refetch: () => {
            authStatusQuery.refetch();
            if (authStatusQuery.data) {
                currentUserQuery.refetch();
            }
        },
    };
};
