import {User} from '../features/auth/services/authService';
import {CanonicalGrade, normalizeUserGrade, purposeToGrade} from '../features/auth/utils/grade';

export type AuthPurpose = 'boss' | 'employee' | 'personal';
export type PendingPurposeSlug = 'master' | 'employee' | 'user';
export type HomeLandingScreen = 'UserMyPageScreen' | 'EmployeeMyPageScreen' | 'MasterMyPageScreen' | 'EmployeeAttendanceHome';
export type AuthGateScreen = 'Login' | 'Signup' | 'KakaoLogin' | 'Consent' | 'ProfileBasics';
export type AuthGateParams = {selectedPurpose?: AuthPurpose; fromSignup?: boolean};

export type RootRoute =
    | {name: 'SodamLanding'; params?: undefined}
    | {name: 'Auth'; params: {screen?: AuthGateScreen; params?: AuthGateParams}}
    | {name: 'HomeRoot'; params: {screen?: HomeLandingScreen; params?: any}};

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

/** 랜딩 판정에 필요한 사용자 상태 — role 만으로는 개인 모드 사용자를 구분할 수 없다. */
type LandingUser = Pick<User, 'role' | 'personalModeEnabled' | 'activeStoreCount'>;

/**
 * 로그인 후 첫 화면.
 *
 * 판정 기준은 등급이 아니라 **지금 소속이 있는가**다. 개인 모드는 역할이 아니라 상태라서
 * 등급을 낮추지 않으므로(등급을 낮추면 인증채용·채용채팅·경력증명서가 전부 403 이 된다),
 * role 만 보면 매장 소속이 0건인 사람도 직원 홈으로 보내게 된다 — 출근 버튼과 오늘 스케줄만
 * 있는 화면이라 소속이 없으면 빈 껍데기가 된다.
 *
 * `activeStoreCount` 가 undefined 인 응답(구버전 BE·필드 누락)에서는 기존 동작을 그대로 유지한다.
 */
export const homeScreenForUser = (
    user?: LandingUser | null,
    fallbackPurpose?: AuthPurpose,
): HomeLandingScreen => {
    const grade = resolveUserGrade(user, fallbackPurpose);
    if (grade === 'EMPLOYEE' && user?.activeStoreCount === 0 && user?.personalModeEnabled) {
        // 소속이 없고 개인 모드를 켠 사용자 — 개인 기록장이 그의 홈이다.
        return 'UserMyPageScreen';
    }
    return homeScreenForGrade(grade);
};

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

    // 전환 권유(suggestPersonalMode)는 아직 라우팅하지 않는다 — 동의 화면의 필수 고지 문구가
    // 법무·노무 검토 확정 전이라(임금·퇴직금 청구권 무영향 / 근로관계 종료와 무관 / 탈퇴 아님),
    // 문구 없이 화면을 띄우면 근로자가 권리 포기로 오인할 수 있다.
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
    return {name: 'SodamLanding'};
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
