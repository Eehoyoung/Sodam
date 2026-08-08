import {
    homeScreenForUser,
    pendingSlugToPurpose,
    resolveInitialRootRoute,
    resolvePostAuthRoute,
} from '../../src/navigation/authFlow';
import {User} from '../../src/features/auth/services/authService';

const baseUser = (overrides: Partial<User> = {}): User => ({
    id: 1,
    name: 'Kim',
    email: 'kim@sodam.test',
    role: 'PERSONAL',
    consentCompleted: true,
    profileCompleted: true,
    ...overrides,
});

describe('authFlow navigation decisions', () => {
    test('no restored session starts at SodamLanding onboarding', () => {
        expect(resolveInitialRootRoute(null, false)).toEqual({name: 'SodamLanding'});
    });

    test('restored authenticated session skips welcome and lands by role', () => {
        expect(resolveInitialRootRoute(baseUser({role: 'MASTER'}), true)).toEqual({
            name: 'HomeRoot',
            params: {screen: 'MasterMyPageScreen'},
        });
    });

    test('consent false is forced before profile and home', () => {
        expect(resolvePostAuthRoute(baseUser({consentCompleted: false, profileCompleted: false}))).toEqual({
            name: 'Auth',
            params: {screen: 'Consent', params: undefined},
        });
    });

    test('profile false is forced before home', () => {
        expect(resolvePostAuthRoute(baseUser({profileCompleted: false}))).toEqual({
            name: 'Auth',
            params: {screen: 'ProfileBasics', params: undefined},
        });
    });

    test('server role wins over selected purpose fallback', () => {
        // EMPLOYEE 랜딩은 승인 출퇴근 버튼이 있는 EmployeeAttendanceHome — 마이페이지는 빠른메뉴로 이동.
        expect(homeScreenForUser(baseUser({role: 'EMPLOYEE'}), 'boss')).toBe('EmployeeAttendanceHome');
    });

    test('selected purpose is fallback when server role is missing', () => {
        expect(homeScreenForUser(baseUser({role: undefined}), 'boss')).toBe('MasterMyPageScreen');
    });

    // ── 개인 모드 랜딩(WP-K) ────────────────────────────────────────
    // 개인 모드는 역할이 아니라 상태라서 role 은 EMPLOYEE 그대로다.
    // role 만 보고 분기하면 매장 소속이 0건인 사람도 직원 홈(출근 버튼·오늘 스케줄)으로 가서 빈 화면을 본다.

    test('소속 0건 + 개인 모드 ON 이면 개인 기록장으로 간다', () => {
        expect(homeScreenForUser(baseUser({
            role: 'EMPLOYEE',
            activeStoreCount: 0,
            personalModeEnabled: true,
        }))).toBe('UserMyPageScreen');
    });

    test('소속이 있으면 개인 모드를 켰어도 직원 홈으로 간다 — 매장 근무가 주(主)', () => {
        expect(homeScreenForUser(baseUser({
            role: 'EMPLOYEE',
            activeStoreCount: 2,
            personalModeEnabled: true,
        }))).toBe('EmployeeAttendanceHome');
    });

    test('소속 0건이어도 개인 모드가 꺼져 있으면 기존 동작을 유지한다', () => {
        expect(homeScreenForUser(baseUser({
            role: 'EMPLOYEE',
            activeStoreCount: 0,
            personalModeEnabled: false,
        }))).toBe('EmployeeAttendanceHome');
    });

    test('activeStoreCount 가 없는 응답에서는 기존 동작을 그대로 유지한다', () => {
        expect(homeScreenForUser(baseUser({
            role: 'EMPLOYEE',
            personalModeEnabled: true,
        }))).toBe('EmployeeAttendanceHome');
    });

    test('사장은 개인 모드 상태와 무관하게 사장 홈으로 간다', () => {
        expect(homeScreenForUser(baseUser({
            role: 'MASTER',
            activeStoreCount: 0,
            personalModeEnabled: true,
        }))).toBe('MasterMyPageScreen');
    });

    test('pending signup slug maps to the same purpose vocabulary', () => {
        expect(pendingSlugToPurpose('master')).toBe('boss');
        expect(pendingSlugToPurpose('user')).toBe('personal');
        expect(pendingSlugToPurpose('employee')).toBe('employee');
    });
});
