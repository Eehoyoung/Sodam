import React, {createContext, ReactNode, useContext, useEffect, useRef} from 'react';
import {User} from '../features/auth/services/authService';
import {useAppleLogin, useAuthState, useKakaoLogin, useLogin, useLogout} from '../features/auth/hooks/useAuthQueries';
import {unifiedStorage} from '../common/utils/unifiedStorage';
import {safeLogger} from '../utils/safeLogger';
import { setOnUnauthorized } from '../common/utils/api';
import {navigate} from '../navigation/navigationRef';
import PaywallHost from '../features/subscription/components/PaywallHost';
import {useFcmRegistration} from '../common/hooks/useFcmRegistration';

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
    kakaoLogin: (code: string) => Promise<User>;
    appleLogin: (identityToken: string) => Promise<User>;
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
    appleLogin: async () => {
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
            appleLogin: async () => {
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
    const appleLoginMutation = useAppleLogin();

    // refetchAuth 를 ref 로 안정화 — useAuthState 가 매 렌더마다 새 함수를 반환해
    // useEffect dep 에 두면 무한 재실행(addViewAt mount 폭발 진원) 이 일어남.
    const refetchAuthRef = useRef(refetchAuth);
    useEffect(() => {
        refetchAuthRef.current = refetchAuth;
    });

    /**
     * 통합 스토리지 초기화 — 1회만 실행 (initRef 가드).
     */
    const storageInitRef = useRef(false);
    useEffect(() => {
        if (storageInitRef.current) {
            return;
        }
        storageInitRef.current = true;
        (async () => {
            try {
                await unifiedStorage.initialize();
                console.log('[AuthProvider] 통합 스토리지 초기화 완료');
                refetchAuthRef.current();
            } catch (error) {
                console.error('[AuthProvider] 통합 스토리지 초기화 실패:', error);
                safeLogger.error('Storage initialization failed', error);
            }
        })();
    }, []);

    // FCM 디바이스 토큰 등록/해제를 인증 상태에 연결 (key-ready — 모듈 부재 시 no-op)
    useFcmRegistration(isAuthenticated);

    // 직전 인증 여부 추적 — 세션 만료(A1) 안내를 "로그인 상태였다가 튕긴 경우"에만 노출
    const wasAuthedRef = useRef(false);
    useEffect(() => {
        wasAuthedRef.current = isAuthenticated;
    }, [isAuthenticated]);

    // 전역 401(리프레시 실패 등) 발생 시 인증 상태 재확인 + 세션 만료 안내 (갭분석 A1)
    // 1회 등록 — refetchAuthRef 통해 항상 최신 함수 호출.
    useEffect(() => {
        setOnUnauthorized(() => {
            // 여기서 user 를 비우면 Protected(!user → Login reset)가 의도된 SessionExpired 안내 화면을
            // 건너뛰어 버린다. 그래서 캐시 정리는 SessionExpired 의 '다시 로그인'(onRelogin)에서 한다.
            refetchAuthRef.current();
            if (wasAuthedRef.current) {
                navigate('SessionExpired');
            }
        });
        return () => setOnUnauthorized(null);
    }, []);

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
    const kakaoLogin = async (code: string): Promise<User> => {
        try {
            console.log('[AuthProvider] 카카오 로그인 시도');
            const result = await kakaoLoginMutation.mutateAsync(code);
            console.log('[AuthProvider] 카카오 로그인 성공');
            return result.user;
        } catch (error) {
            console.error('[AuthProvider] 카카오 로그인 실패:', error);
            safeLogger.error('Kakao login failed', error);
            throw error;
        }
    };

    /**
     * Apple 로그인 함수 (iOS 전용 — Sign in with Apple)
     * TanStack Query 뮤테이션을 사용하여 Apple 로그인 처리
     */
    const appleLogin = async (identityToken: string): Promise<User> => {
        try {
            console.log('[AuthProvider] Apple 로그인 시도');
            const result = await appleLoginMutation.mutateAsync(identityToken);
            console.log('[AuthProvider] Apple 로그인 성공');
            return result.user;
        } catch (error) {
            console.error('[AuthProvider] Apple 로그인 실패:', error);
            safeLogger.error('Apple login failed', error);
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
        if (appleLoginMutation.error) {
            console.error('[AuthProvider] Apple 로그인 뮤테이션 오류:', appleLoginMutation.error);
        }
    }, [loginMutation.error, logoutMutation.error, kakaoLoginMutation.error, appleLoginMutation.error]);

    /**
     * 로딩 상태 계산
     * 인증 상태 로딩 또는 뮤테이션 진행 중일 때 true
     */
    const loading = authLoading ||
        loginMutation.isPending ||
        logoutMutation.isPending ||
        kakaoLoginMutation.isPending ||
        appleLoginMutation.isPending;

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
        appleLogin,
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
            {/* 전역 페이월(402 PLAN_REQUIRED) — 401 핸들러와 동일하게 앱 루트 1회 마운트 */}
            <PaywallHost />
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
        isMaster: user?.role === 'MASTER',
        isUser: user?.role === 'USER',

        // 권한 확인 헬퍼
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
