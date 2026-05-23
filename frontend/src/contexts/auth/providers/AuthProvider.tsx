import React, {createContext, ReactNode, useContext, useEffect} from 'react';
import {useAuthState} from '../hooks/useAuthState';
import {useAuthActions} from '../hooks/useAuthActions';
import {useFirstLaunch} from '../hooks/useFirstLaunch';
import {User} from '../../../features/auth/services/authService';

interface AuthContextType {
    // 상태
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    isFirstLaunch: boolean;

    // 액션
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    kakaoLogin: (code: string) => Promise<void>;
    setFirstLaunchComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        console.error('[useAuth] AuthContext not found - using default values');
        return {
            isAuthenticated: false,
            user: null,
            loading: false,
            isFirstLaunch: true,
            login: async () => {
                throw new Error('AuthProvider not found');
            },
            logout: async () => {
                throw new Error('AuthProvider not found');
            },
            kakaoLogin: async () => {
                throw new Error('AuthProvider not found');
            },
            setFirstLaunchComplete: async () => {
                throw new Error('AuthProvider not found');
            },
        };
    }

    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const authState = useAuthState();
    const authActions = useAuthActions();
    const firstLaunch = useFirstLaunch();

    // 앱 시작 시 초기화 (한 번만 실행)
    useEffect(() => {
        let isMounted = true;
        let hasInitialized = false;

        const initializeAuth = async () => {
            if (!isMounted || hasInitialized) return;
            hasInitialized = true;

            try {
                console.log('[AuthProvider] Starting initialization...');
                // 인증 상태 확인 (첫 실행 확인은 useFirstLaunch에서 자동으로 처리됨)
                const authResult = await authActions.checkAuthStatus();
                if (authResult.success && isMounted) {
                    // 토큰이 없는 경우(user: null)도 명시적으로 처리하여 로딩 상태 종료
                    authState.setUser(authResult.user);
                    console.log('[AuthProvider] Auth status checked:', authResult.user ? 'User found' : 'No token found');
                }
            } catch (error) {
                console.error('[AuthProvider] Initialization failed:', error);
                // 에러 발생 시에도 인증되지 않은 상태로 설정
                if (isMounted) {
                    authState.setUser(null);
                }
            } finally {
                if (isMounted) {
                    authState.setLoading(false);
                    console.log('[AuthProvider] Initialization completed');
                }
            }
        };

        // 지연 실행으로 네이티브 모듈 초기화 대기
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                initializeAuth();
            }
        }, 500);

        // 최대 타임아웃
        const maxTimeoutId = setTimeout(() => {
            if (isMounted && !hasInitialized) {
                console.log('[AuthProvider] Force loading complete due to timeout');
                authState.setLoading(false);
                hasInitialized = true;
            }
        }, 3000);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            clearTimeout(maxTimeoutId);
        };
    }, []); // 의존성 배열 제거 - 한 번만 실행

    // 액션 래퍼 - 기존 API와 호환성 유지
    const login = async (email: string, password: string) => {
        authState.setLoading(true);
        try {
            const result = await authActions.login(email, password);
            if (result.success) {
                authState.setUser(result.user);
            } else {
                throw new Error('Login failed');
            }
        } finally {
            authState.setLoading(false);
        }
    };

    const logout = async () => {
        authState.setLoading(true);
        try {
            await authActions.logout();
            authState.resetAuth();
        } finally {
            authState.setLoading(false);
        }
    };

    const kakaoLogin = async (code: string) => {
        authState.setLoading(true);
        try {
            const result = await authActions.kakaoLogin(code);
            if (result.success) {
                authState.setUser(result.user);
            } else {
                throw new Error('Kakao login failed');
            }
        } finally {
            authState.setLoading(false);
        }
    };

    const value: AuthContextType = {
        // 상태
        isAuthenticated: authState.isAuthenticated,
        user: authState.user,
        loading: authState.loading,
        isFirstLaunch: firstLaunch.isFirstLaunch,

        // 액션
        login,
        logout,
        kakaoLogin,
        setFirstLaunchComplete: firstLaunch.setFirstLaunchComplete,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
