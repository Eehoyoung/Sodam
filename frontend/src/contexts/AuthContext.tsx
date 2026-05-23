import React, {createContext, ReactNode, useContext, useEffect} from 'react';
import {User} from '../features/auth/services/authService';
import {useAuthState, useKakaoLogin, useLogin, useLogout} from '../features/auth/hooks/useAuthQueries';
import {unifiedStorage} from '../common/utils/unifiedStorage';
import {safeLogger} from '../utils/safeLogger';
import { setOnUnauthorized } from '../common/utils/api';

/**
 * 인증 컨텍스트 타입 정의
 * TanStack Query와 통합된 인증 상태 관리
 */
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => Promise<void>;
    kakaoLogin: (code: string) => Promise<void>;
}

/**
 * 기본 인증 컨텍스트 값
 */
const defaultAuthContext: AuthContextType = {
    isAuthenticated: false,
    user: null,
    loading: true,
    login: async () => {
        throw new Error('AuthProvider not found');
    },
    logout: async () => {
        throw new Error('AuthProvider not found');
    },
    kakaoLogin: async () => {
        throw new Error('AuthProvider not found');
    },
};

/**
 * 인증 컨텍스트 생성
 */
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

/**
 * 인증 컨텍스트 훅
 * 안전장치가 포함된 useAuth 훅
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        console.error('[useAuth] AuthContext not found - using default values');
        safeLogger.error('AuthContext not found', new Error('AuthProvider not mounted'));

        // 기본값 반환으로 앱 크래시 방지
        return {
            isAuthenticated: false,
            user: null,
            loading: false,
            login: async () => {
                throw new Error('AuthProvider not found');
            },
            logout: async () => {
                throw new Error('AuthProvider not found');
            },
            kakaoLogin: async () => {
                throw new Error('AuthProvider not found');
            },
        };
    }

    return context;
};

/**
 * AuthProvider Props 인터페이스
 */
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * 인증 프로바이더 컴포넌트
 * TanStack Query 훅을 사용하여 인증 상태를 관리하고 Context로 제공
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    // TanStack Query 훅을 사용하여 인증 상태 관리
    const {
        isAuthenticated,
        user,
        isLoading: authLoading,
        error: authError,
        refetch: refetchAuth
    } = useAuthState();

    // TanStack Query 뮤테이션 훅들
    const loginMutation = useLogin();
    const logoutMutation = useLogout();
    const kakaoLoginMutation = useKakaoLogin();

    /**
     * 통합 스토리지 초기화
     */
    useEffect(() => {
        const initializeStorage = async () => {
            try {
                await unifiedStorage.initialize();
                console.log('[AuthProvider] 통합 스토리지 초기화 완료');

                // 스토리지 초기화 후 인증 상태 재확인
                refetchAuth();
            } catch (error) {
                console.error('[AuthProvider] 통합 스토리지 초기화 실패:', error);
                safeLogger.error('Storage initialization failed', error);
            }
        };

        initializeStorage();
    }, [refetchAuth]);

    // 전역 401(리프레시 실패 등) 발생 시 인증 상태 재확인 및 UI 업데이트
    useEffect(() => {
        setOnUnauthorized(() => {
            refetchAuth();
        });
        return () => setOnUnauthorized(null);
    }, [refetchAuth]);

    /**
     * 로그인 함수
     * TanStack Query 뮤테이션을 사용하여 로그인 처리
     */
    const login = async (email: string, password: string): Promise<User> => {
        try {
            console.log('[AuthProvider] 로그인 시도:', email);
            const result = await loginMutation.mutateAsync({email, password});
            console.log('[AuthProvider] 로그인 성공');
            return result.user;
        } catch (error) {
            console.error('[AuthProvider] 로그인 실패:', error);
            safeLogger.error('Login failed', error);
            throw error;
        }
    };

    /**
     * 로그아웃 함수
     * TanStack Query 뮤테이션을 사용하여 로그아웃 처리
     */
    const logout = async (): Promise<void> => {
        try {
            console.log('[AuthProvider] 로그아웃 시도');
            await logoutMutation.mutateAsync();
            console.log('[AuthProvider] 로그아웃 성공');
        } catch (error) {
            console.error('[AuthProvider] 로그아웃 실패:', error);
            safeLogger.error('Logout failed', error);
            throw error;
        }
    };

    /**
     * 카카오 로그인 함수
     * TanStack Query 뮤테이션을 사용하여 카카오 로그인 처리
     */
    const kakaoLogin = async (code: string): Promise<void> => {
        try {
            console.log('[AuthProvider] 카카오 로그인 시도');
            await kakaoLoginMutation.mutateAsync(code);
            console.log('[AuthProvider] 카카오 로그인 성공');
        } catch (error) {
            console.error('[AuthProvider] 카카오 로그인 실패:', error);
            safeLogger.error('Kakao login failed', error);
            throw error;
        }
    };

    /**
     * 인증 에러 처리
     */
    useEffect(() => {
        if (authError) {
            console.error('[AuthProvider] 인증 오류:', authError);
            safeLogger.error('Authentication error', authError);
        }
    }, [authError]);

    /**
     * 뮤테이션 에러 처리
     */
    useEffect(() => {
        if (loginMutation.error) {
            console.error('[AuthProvider] 로그인 뮤테이션 오류:', loginMutation.error);
        }
        if (logoutMutation.error) {
            console.error('[AuthProvider] 로그아웃 뮤테이션 오류:', logoutMutation.error);
        }
        if (kakaoLoginMutation.error) {
            console.error('[AuthProvider] 카카오 로그인 뮤테이션 오류:', kakaoLoginMutation.error);
        }
    }, [loginMutation.error, logoutMutation.error, kakaoLoginMutation.error]);

    /**
     * 로딩 상태 계산
     * 인증 상태 로딩 또는 뮤테이션 진행 중일 때 true
     */
    const loading = authLoading ||
        loginMutation.isPending ||
        logoutMutation.isPending ||
        kakaoLoginMutation.isPending;

    /**
     * 컨텍스트 값 생성
     */
    const contextValue: AuthContextType = {
        isAuthenticated,
        user,
        loading,
        login,
        logout,
        kakaoLogin,
    };

    /**
     * 디버깅을 위한 상태 로깅
     */
    useEffect(() => {
        if (__DEV__) {
            console.log('[AuthProvider] 상태 변경:', {
                isAuthenticated,
                user: user ? {id: user.id, name: user.name, role: user.role} : null,
                loading,
            });
        }
    }, [isAuthenticated, user, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * 인증 상태 확인 유틸리티 훅
 * 특정 역할이나 권한을 확인할 때 사용
 */
export const useAuthCheck = () => {
    const {isAuthenticated, user, loading} = useAuth();

    return {
        isAuthenticated,
        user,
        loading,

        // 역할 확인 헬퍼
        isEmployee: user?.role === 'EMPLOYEE',
        isManager: user?.role === 'MANAGER',
        isMaster: user?.role === 'MASTER',
        isUser: user?.role === 'USER',

        // 권한 확인 헬퍼
        hasManagerAccess: user?.role === 'MANAGER' || user?.role === 'MASTER',
        hasMasterAccess: user?.role === 'MASTER',

        // 사용자 정보 헬퍼
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        userPhone: user?.phone,
    };
};

/**
 * 인증 필요 컴포넌트 래퍼
 * 인증되지 않은 사용자에게는 로그인 화면을 보여줌
 */
interface RequireAuthProps {
    children: ReactNode;
    fallback?: ReactNode;
    roles?: Array<'EMPLOYEE' | 'MANAGER' | 'MASTER' | 'USER' | 'PERSONAL'>;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({
                                                            children,
                                                            fallback = null,
                                                            roles = []
                                                        }) => {
    const {isAuthenticated, user, loading} = useAuth();

    // 로딩 중일 때는 로딩 표시
    if (loading) {
        return <>{fallback}</>;
    }

    // 인증되지 않은 경우
    if (!isAuthenticated || !user) {
        return <>{fallback}</>;
    }

    // 특정 역할이 필요한 경우 역할 확인
    if (roles.length > 0 && (!user.role || !roles.includes(user.role))) {
        console.warn('[RequireAuth] 권한 부족:', { userRole: user.role, requiredRoles: roles });
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default AuthContext;
