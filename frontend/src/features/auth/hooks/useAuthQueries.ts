import React from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import authService, {AuthResponse, LoginRequest, SignupRequest, User} from '../services/authService';
import {handleQueryError, queryKeys} from '../../../common/utils/queryClient';

/**
 * 인증 관련 TanStack Query 훅들
 * 백엔드 Redis 캐싱과 연계한 최적화된 인증 상태 관리
 */

/**
 * 현재 사용자 정보 조회 쿼리
 * 인증된 사용자의 정보를 가져오고 캐시합니다.
 */
export const useCurrentUser = () => {
    return useQuery({
        queryKey: queryKeys.auth.currentUser(),
        queryFn: async (): Promise<User> => {
            try {
                return await authService.getCurrentUser();
            } catch (error) {
                handleQueryError(error, 'getCurrentUser');
                throw error;
            }
        },
        staleTime: 10 * 60 * 1000, // 10분 - 사용자 정보는 자주 변경되지 않음
        gcTime: 30 * 60 * 1000, // 30분 - 가비지 컬렉션 시간
        enabled: false, // 수동으로 활성화 (인증 상태 확인 후)
        retry: (failureCount, error: any) => {
            // 401 에러는 재시도하지 않음 (인증 실패)
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 3;
        },
        meta: {
            errorMessage: '사용자 정보를 가져오는데 실패했습니다.',
        },
    });
};

/**
 * 인증 상태 확인 쿼리
 * 토큰 유효성을 확인하고 인증 상태를 반환합니다.
 */
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
        staleTime: 5 * 60 * 1000, // 5분
        gcTime: 10 * 60 * 1000, // 10분
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: 1, // 인증 상태 확인은 1번만 재시도
        meta: {
            errorMessage: '인증 상태 확인에 실패했습니다.',
        },
    });
};

/**
 * 로그인 뮤테이션
 * 사용자 로그인을 처리하고 관련 캐시를 업데이트합니다.
 */
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
            // 사용자 정보 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.currentUser(), data.user);

            // 인증 상태 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.all, true);

            // 관련 쿼리 무효화 (다른 사용자 데이터가 있을 수 있음)
            queryClient.invalidateQueries({
                queryKey: queryKeys.auth.all,
                exact: false
            });

            console.log('[TanStack Query] 로그인 성공 - 캐시 업데이트 완료');
        },
        onError: (error: any) => {
            // 로그인 실패 시 인증 관련 캐시 클리어
            queryClient.removeQueries({queryKey: queryKeys.auth.all});

            console.error('[TanStack Query] 로그인 실패:', error);
        },
        meta: {
            errorMessage: '로그인에 실패했습니다.',
        },
    });
};

/**
 * 카카오 로그인 뮤테이션
 * 카카오 OAuth 로그인을 처리하고 관련 캐시를 업데이트합니다.
 */
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
            // 사용자 정보 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.currentUser(), data.user);

            // 인증 상태 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.all, true);

            // 관련 쿼리 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.auth.all,
                exact: false
            });

            console.log('[TanStack Query] 카카오 로그인 성공 - 캐시 업데이트 완료');
        },
        onError: (error: any) => {
            // 로그인 실패 시 인증 관련 캐시 클리어
            queryClient.removeQueries({queryKey: queryKeys.auth.all});

            console.error('[TanStack Query] 카카오 로그인 실패:', error);
        },
        meta: {
            errorMessage: '카카오 로그인에 실패했습니다.',
        },
    });
};

/**
 * 회원가입 뮤테이션
 * 사용자 회원가입을 처리하고 관련 캐시를 업데이트합니다.
 */
export const useSignup = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (signupRequest: SignupRequest): Promise<AuthResponse> => {
            try {
                return await authService.signup(signupRequest);
            } catch (error) {
                handleQueryError(error, 'signup');
                throw error;
            }
        },
        onSuccess: (data: AuthResponse) => {
            // 사용자 정보 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.currentUser(), data.user);

            // 인증 상태 캐시 업데이트
            queryClient.setQueryData(queryKeys.auth.all, true);

            // 관련 쿼리 무효화
            queryClient.invalidateQueries({
                queryKey: queryKeys.auth.all,
                exact: false
            });

            console.log('[TanStack Query] 회원가입 성공 - 캐시 업데이트 완료');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 회원가입 실패:', error);
        },
        meta: {
            errorMessage: '회원가입에 실패했습니다.',
        },
    });
};

/**
 * 로그아웃 뮤테이션
 * 사용자 로그아웃을 처리하고 모든 캐시를 클리어합니다.
 */
export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<void> => {
            try {
                await authService.logout();
            } catch (error) {
                handleQueryError(error, 'logout');
                // 로그아웃은 실패해도 캐시는 클리어해야 함
            }
        },
        onSuccess: () => {
            // 모든 캐시 클리어 (사용자 데이터 완전 제거)
            queryClient.clear();

            console.log('[TanStack Query] 로그아웃 완료 - 모든 캐시 클리어');
        },
        onError: (error: any) => {
            // 로그아웃 실패해도 캐시는 클리어
            queryClient.clear();

            console.error('[TanStack Query] 로그아웃 처리 중 오류 발생:', error);
        },
        meta: {
            errorMessage: '로그아웃 처리 중 오류가 발생했습니다.',
        },
    });
};

/**
 * 비밀번호 재설정 요청 뮤테이션
 * 비밀번호 재설정 이메일 발송을 요청합니다.
 */
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
            console.log('[TanStack Query] 비밀번호 재설정 요청 완료');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 비밀번호 재설정 요청 실패:', error);
        },
        meta: {
            errorMessage: '비밀번호 재설정 요청에 실패했습니다.',
        },
    });
};

/**
 * 비밀번호 재설정 뮤테이션
 * 새로운 비밀번호로 재설정을 처리합니다.
 */
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
            console.log('[TanStack Query] 비밀번호 재설정 완료');
        },
        onError: (error: any) => {
            console.error('[TanStack Query] 비밀번호 재설정 실패:', error);
        },
        meta: {
            errorMessage: '비밀번호 재설정에 실패했습니다.',
        },
    });
};

/**
 * 인증 관련 유틸리티 훅들
 */

/**
 * 현재 사용자 정보와 인증 상태를 함께 관리하는 복합 훅
 */
export const useAuthState = () => {
    const authStatusQuery = useAuthStatus();
    const currentUserQuery = useCurrentUser();

    // 인증 상태가 확인되면 사용자 정보 쿼리 활성화
    React.useEffect(() => {
        if (authStatusQuery.data === true && !currentUserQuery.isEnabled) {
            currentUserQuery.refetch();
        }
    }, [authStatusQuery.data, currentUserQuery]);

    return {
        isAuthenticated: authStatusQuery.data ?? false,
        user: currentUserQuery.data ?? null,
        isLoading: authStatusQuery.isLoading || currentUserQuery.isLoading,
        error: authStatusQuery.error || currentUserQuery.error,
        refetch: () => {
            authStatusQuery.refetch();
            if (authStatusQuery.data) {
                currentUserQuery.refetch();
            }
        },
    };
};
