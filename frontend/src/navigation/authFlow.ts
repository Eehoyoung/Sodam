import {User} from '../features/auth/services/authService';
import {CanonicalGrade, normalizeUserGrade, purposeToGrade} from '../features/auth/utils/grade';

export type OnboardingRole = 'owner' | 'employee' | 'personal';
export type AuthPurpose = 'boss' | 'employee' | 'personal';
export type PendingPurposeSlug = 'master' | 'employee' | 'user';
export type HomeLandingScreen = 'UserMyPageScreen' | 'EmployeeMyPageScreen' | 'MasterMyPageScreen' | 'EmployeeAttendanceHome';
export type AuthGateScreen = 'Login' | 'Signup' | 'KakaoLogin' | 'Consent' | 'ProfileBasics';
export type AuthGateParams = {selectedPurpose?: AuthPurpose; fromSignup?: boolean};

export type RootRoute =
    | {name: 'Welcome'; params?: {selectedRole?: OnboardingRole; selectedPurpose?: AuthPurpose}}
    | {name: 'Auth'; params: {screen?: AuthGateScreen; params?: AuthGateParams}}
    | {name: 'HomeRoot'; params: {screen?: HomeLandingScreen; params?: any}};

export const roleToPurpose = (role?: OnboardingRole): AuthPurpose | undefined => {
    if (role === 'owner') {
        return 'boss';
    }
    if (role === 'employee') {
        return 'employee';
    }
    if (role === 'personal') {
        return 'personal';
    }
    return undefined;
};

export const purposeToPendingSlug = (purpose: AuthPurpose): PendingPurposeSlug => {
    if (purpose === 'boss') {
        return 'master';
    }
    if (purpose === 'employee') {
        return 'employee';
    }
    return 'user';
};

export const pendingSlugToPurpose = (slug?: string | null): AuthPurpose | undefined => {
    if (slug === 'master' || slug === 'boss') {
        return 'boss';
    }
    if (slug === 'employee') {
        return 'employee';
    }
    if (slug === 'user' || slug === 'personal') {
        return 'personal';
    }
    return undefined;
};

export const purposeLabel = (purpose?: AuthPurpose): string => {
    if (purpose === 'boss') {
        return '사장님';
    }
    if (purpose === 'employee') {
        return '직원';
    }
    return '개인';
};

export const hasServerRole = (user?: Pick<User, 'role'> | null): boolean => {
    return typeof user?.role === 'string' && user.role.trim().length > 0;
};

export const resolveUserGrade = (
    user?: Pick<User, 'role'> | null,
    fallbackPurpose?: AuthPurpose,
): CanonicalGrade => {
    if (hasServerRole(user)) {
        return normalizeUserGrade(user?.role as string);
    }
    if (fallbackPurpose) {
        return purposeToGrade(fallbackPurpose);
    }
    return 'PERSONAL';
};

export const homeScreenForGrade = (grade: CanonicalGrade): HomeLandingScreen => {
    if (grade === 'MASTER') {
        return 'MasterMyPageScreen';
    }
    if (grade === 'EMPLOYEE') {
        // 직원 랜딩 = 시안(employee-home-screen-mockup) 디자인 화면. 승인 출퇴근 버튼 포함.
        // 마이페이지(급여·휴가·시급 이력)는 빠른 메뉴/설정으로 접근.
        return 'EmployeeAttendanceHome';
    }
    return 'UserMyPageScreen';
};

export const homeScreenForUser = (
    user?: Pick<User, 'role'> | null,
    fallbackPurpose?: AuthPurpose,
): HomeLandingScreen => homeScreenForGrade(resolveUserGrade(user, fallbackPurpose));

export const resolvePostAuthRoute = (
    user: User,
    fallbackPurpose?: AuthPurpose,
): RootRoute => {
    const nestedParams =
        fallbackPurpose ? {selectedPurpose: fallbackPurpose} : undefined;

    if (user.consentCompleted === false) {
        return {
            name: 'Auth',
            params: {screen: 'Consent', params: nestedParams},
        };
    }

    if (user.profileCompleted === false) {
        return {
            name: 'Auth',
            params: {screen: 'ProfileBasics', params: nestedParams},
        };
    }

    return {
        name: 'HomeRoot',
        params: {screen: homeScreenForUser(user, fallbackPurpose)},
    };
};

export const resolveInitialRootRoute = (
    user: User | null,
    isAuthenticated: boolean,
): RootRoute => {
    if (user) {
        return resolvePostAuthRoute(user);
    }
    if (isAuthenticated) {
        return {name: 'Auth', params: {screen: 'Login'}};
    }
    return {name: 'Welcome'};
};

export const resetToRootRoute = (navigation: any, route: RootRoute) => {
    navigation.reset({
        index: 0,
        routes: [{name: route.name as never, params: route.params as never}] as any,
    });
};

export type AuthFlowScreenParams = {
    selectedPurpose?: AuthPurpose;
};
