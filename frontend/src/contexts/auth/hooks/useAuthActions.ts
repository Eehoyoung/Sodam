import {useCallback, useRef} from 'react';
import authService from '../../../features/auth/services/authService';
import {safeLogger} from '../../../utils/safeLogger';
import {useStorage} from './useStorage';

interface AuthActionsHook {
    login: (email: string, password: string) => Promise<{ success: boolean; user?: any }>;
    logout: () => Promise<{ success: boolean }>;
    kakaoLogin: (code: string) => Promise<{ success: boolean; user?: any }>;
    checkAuthStatus: () => Promise<{ success: boolean; user?: any }>;
    isLoading: boolean;
}

export const useAuthActions = (): AuthActionsHook => {
    const {getItem, removeItem} = useStorage();
    const isLoadingRef = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const login = useCallback(async (email: string, password: string) => {
        try {
            isLoadingRef.current = true;
            console.log('[useAuthActions] Starting login process');

            const response = await authService.login({email, password});

            console.log('[useAuthActions] Login successful');
            return {success: true, user: response.user};
        } catch (error) {
            safeLogger.error('[useAuthActions] Login failed:', error);
            return {success: false};
        } finally {
            isLoadingRef.current = false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            isLoadingRef.current = true;
            console.log('[useAuthActions] Starting logout process');

            await authService.logout();

            console.log('[useAuthActions] Logout successful');
            return {success: true};
        } catch (error) {
            safeLogger.error('[useAuthActions] Logout failed:', error);
            return {success: true}; // Always succeed locally
        } finally {
            isLoadingRef.current = false;
        }
    }, []);

    const kakaoLogin = useCallback(async (code: string) => {
        try {
            isLoadingRef.current = true;
            console.log('[useAuthActions] Starting Kakao login process');

            const response = await authService.kakaoLogin(code);

            if (response.token) {
                const userData = await authService.getCurrentUser();
                console.log('[useAuthActions] Kakao login successful');
                return {success: true, user: userData};
            } else {
                throw new Error('카카오 로그인 실패');
            }
        } catch (error) {
            safeLogger.error('[useAuthActions] Kakao login failed:', error);
            return {success: false};
        } finally {
            isLoadingRef.current = false;
        }
    }, []);

    const checkAuthStatus = useCallback(async () => {
        try {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();
            isLoadingRef.current = true;

            const token = await getItem('userToken');

            if (token) {
                console.log('[useAuthActions] Token found, fetching user data...');
                const userData = await authService.getCurrentUser();
                console.log('[useAuthActions] User authenticated successfully');
                return {success: true, user: userData};
            } else {
                console.log('[useAuthActions] No token found');
                return {success: true, user: null};
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('[useAuthActions] Auth check aborted');
                return {success: false};
            }

            safeLogger.error('[useAuthActions] Auth check failed:', error);
            try {
                await removeItem('userToken');
            } catch (removeError) {
                safeLogger.error('[useAuthActions] Failed to remove token:', removeError);
            }
            return {success: true, user: null};
        } finally {
            isLoadingRef.current = false;
            abortControllerRef.current = null;
        }
    }, [getItem, removeItem]);

    return {
        login,
        logout,
        kakaoLogin,
        checkAuthStatus,
        isLoading: isLoadingRef.current,
    };
};
