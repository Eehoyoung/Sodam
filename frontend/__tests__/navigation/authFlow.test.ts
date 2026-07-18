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

    test('pending signup slug maps to the same purpose vocabulary', () => {
        expect(pendingSlugToPurpose('master')).toBe('boss');
        expect(pendingSlugToPurpose('user')).toBe('personal');
        expect(pendingSlugToPurpose('employee')).toBe('employee');
    });
});
