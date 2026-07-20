import authService from '../../src/features/auth/services/authService';
import TokenManager from '../../src/common/auth/tokenStore';
import api from '../../src/common/api/client';

jest.mock('../../src/common/api/client', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
        patch: jest.fn(),
    },
}));

jest.mock('../../src/common/auth/tokenStore', () => ({
    __esModule: true,
    default: {
        getAccess: jest.fn(),
        getRefresh: jest.fn(),
        getTokens: jest.fn(),
        setAccess: jest.fn(),
        setRefresh: jest.fn(),
        setTokens: jest.fn(),
        clear: jest.fn(),
    },
}));

// unifiedStorage 동적 import 우회 — logout 내부에서 await import 사용
jest.mock('../../src/common/utils/unifiedStorage', () => ({
    __esModule: true,
    unifiedStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn().mockResolvedValue(undefined),
    },
}));

// global.atob (JWT 디코딩)
if (typeof (global as any).atob !== 'function') {
    (global as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

const makeJwt = (expSec: number): string => {
    const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64url');
    const payload = Buffer.from(JSON.stringify({sub: 'u1', exp: expSec})).toString('base64url');
    return `${header}.${payload}.sig`;
};

const TokenManagerMock = TokenManager as jest.Mocked<typeof TokenManager>;

describe('Auth 세션 라이프사이클 — 회원가입·로그인·자동로그인·로그아웃·세션삭제', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        TokenManagerMock.getTokens.mockResolvedValue(null);
        TokenManagerMock.getAccess.mockResolvedValue(null);
        TokenManagerMock.getRefresh.mockResolvedValue(null);
        TokenManagerMock.setAccess.mockResolvedValue(undefined);
        TokenManagerMock.setTokens.mockResolvedValue(undefined);
        TokenManagerMock.clear.mockResolvedValue(undefined);
    });

    // ============ 로그인 ============
    describe('login', () => {
        test('성공 시 access/refresh 토큰 저장 + user 반환', async () => {
            (api.post as jest.Mock).mockResolvedValue({
                data: {
                    success: true,
                    message: 'ok',
                    data: {
                        accessToken: 'access-1',
                        refreshToken: 'refresh-1',
                        userId: 9,
                        userGrade: 'ROLE_MASTER',
                        name: '홍길동',
                        phone: '01012345678',
                        profileCompleted: true,
                    },
                },
            });

            const result = await authService.login({email: 'a@b.c', password: 'p'});

            expect(TokenManagerMock.setTokens).toHaveBeenCalledWith({
                accessToken: 'access-1',
                refreshToken: 'refresh-1',
            });
            expect(result.user.profileCompleted).toBe(true);
            expect(result.user.phone).toBe('01012345678');
        });

        test('refresh 토큰 없는 응답 — access 만 저장 (kakao 등)', async () => {
            // envelope 가 없는 평탄형 응답 (mapAuthResponse 의 root = data)
            (api.post as jest.Mock).mockResolvedValue({
                data: {accessToken: 'a-only', userId: 1, userGrade: 'PERSONAL'},
            });

            await authService.login({email: 'x@x.x', password: 'p'});

            expect(TokenManagerMock.setAccess).toHaveBeenCalledWith('a-only');
            expect(TokenManagerMock.setTokens).not.toHaveBeenCalled();
        });

        test('accessToken 없으면 INVALID_LOGIN_RESPONSE throw', async () => {
            (api.post as jest.Mock).mockResolvedValue({data: {refreshToken: 'r'}});

            await expect(authService.login({email: 'a', password: 'p'}))
                .rejects.toThrow('INVALID_LOGIN_RESPONSE');
        });
    });

    // ============ 자동 로그인 (isAuthenticated) ============
    describe('isAuthenticated (자동 로그인 게이트)', () => {
        test('토큰 없으면 false', async () => {
            TokenManagerMock.getAccess.mockResolvedValue(null);
            expect(await authService.isAuthenticated()).toBe(false);
        });

        test('유효한 미만료 JWT 면 true', async () => {
            const future = Math.floor(Date.now() / 1000) + 3600;
            TokenManagerMock.getAccess.mockResolvedValue(makeJwt(future));
            expect(await authService.isAuthenticated()).toBe(true);
        });

        test('만료된 JWT 면 false (만료 토큰을 살아있다고 잘못 판정하지 않음)', async () => {
            const past = Math.floor(Date.now() / 1000) - 60;
            TokenManagerMock.getAccess.mockResolvedValue(makeJwt(past));
            expect(await authService.isAuthenticated()).toBe(false);
        });

        test('형식 깨진 토큰은 서버 판정에 위임 (true)', async () => {
            TokenManagerMock.getAccess.mockResolvedValue('not-a-jwt');
            expect(await authService.isAuthenticated()).toBe(true);
        });
    });

    // ============ getCurrentUser (메인 진입 시 user 로드) ============
    describe('isAuthenticated refresh fallback', () => {
        test('expired access with refresh token refreshes session and returns true', async () => {
            const past = Math.floor(Date.now() / 1000) - 60;
            const newJwt = makeJwt(Math.floor(Date.now() / 1000) + 3600);
            TokenManagerMock.getAccess.mockResolvedValue(makeJwt(past));
            TokenManagerMock.getRefresh.mockResolvedValue('refresh-1');
            (api.post as jest.Mock).mockResolvedValue({
                data: {
                    success: true,
                    message: 'refreshed',
                    data: {
                        accessToken: newJwt,
                        refreshToken: 'refresh-2',
                        userId: 1,
                        userGrade: 'PERSONAL',
                    },
                },
            });

            expect(await authService.isAuthenticated()).toBe(true);
            expect(api.post).toHaveBeenCalledWith('/api/auth/refresh', {refreshToken: 'refresh-1'});
            expect(TokenManagerMock.setTokens).toHaveBeenCalledWith({
                accessToken: newJwt,
                refreshToken: 'refresh-2',
            });
        });

        test('missing access with refresh token refreshes session and returns true', async () => {
            const newJwt = makeJwt(Math.floor(Date.now() / 1000) + 3600);
            TokenManagerMock.getAccess.mockResolvedValue(null);
            TokenManagerMock.getRefresh.mockResolvedValue('refresh-only');
            (api.post as jest.Mock).mockResolvedValue({
                data: {
                    success: true,
                    message: 'refreshed',
                    data: {
                        accessToken: newJwt,
                        refreshToken: 'refresh-rotated',
                        userId: 1,
                        userGrade: 'PERSONAL',
                    },
                },
            });

            expect(await authService.isAuthenticated()).toBe(true);
            expect(api.post).toHaveBeenCalledWith('/api/auth/refresh', {refreshToken: 'refresh-only'});
            expect(TokenManagerMock.setTokens).toHaveBeenCalledWith({
                accessToken: newJwt,
                refreshToken: 'refresh-rotated',
            });
        });
    });

    describe('getCurrentUser', () => {
        test('200 응답 시 user(profileCompleted/phone 포함) 반환', async () => {
            (api.get as jest.Mock).mockResolvedValue({
                data: {
                    id: 9,
                    email: 'a@b.c',
                    name: '홍길동',
                    role: 'MASTER',
                    phone: '01012345678',
                    profileCompleted: true,
                },
            });

            const user = await authService.getCurrentUser();

            // 첫 호출은 /api/auth/me — fallback 미발동 (200)
            expect((api.get as jest.Mock).mock.calls[0][0]).toBe('/api/auth/me');
            expect(user.profileCompleted).toBe(true);
            expect(user.phone).toBe('01012345678');
        });

        test('401/403/404 silent — logger.error 안 찍힘', async () => {
            const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'error');
            (api.get as jest.Mock).mockRejectedValue({response: {status: 401}});

            await expect(authService.getCurrentUser()).rejects.toBeTruthy();
            expect(loggerSpy).not.toHaveBeenCalled();
            loggerSpy.mockRestore();
        });

        test('500 등 진짜 오류는 logger.error 노출', async () => {
            const loggerSpy = jest.spyOn(require('../../src/utils/logger').logger, 'error');
            (api.get as jest.Mock).mockRejectedValue({response: {status: 500}});

            await expect(authService.getCurrentUser()).rejects.toBeTruthy();
            expect(loggerSpy).toHaveBeenCalled();
            loggerSpy.mockRestore();
        });
    });

    // ============ 로그아웃 (세션 삭제 보장) ============
    describe('logout', () => {
        test('BE 호출 성공 + 로컬 토큰 clear', async () => {
            TokenManagerMock.getRefresh.mockResolvedValue('refresh-1');
            (api.post as jest.Mock).mockResolvedValue({data: {success: true}});

            await authService.logout();

            expect(api.post).toHaveBeenCalledWith('/api/auth/logout', {refreshToken: 'refresh-1'});
            expect(TokenManagerMock.clear).toHaveBeenCalled();
        });

        test('BE 호출 실패해도 로컬 토큰 clear 보장 (오프라인·서버 다운 대비)', async () => {
            TokenManagerMock.getRefresh.mockResolvedValue('refresh-1');
            (api.post as jest.Mock).mockRejectedValue(new Error('Network'));

            await authService.logout();

            // BE 실패해도 로컬 세션 정리
            expect(TokenManagerMock.clear).toHaveBeenCalled();
        });

        test('refresh 토큰 없으면 BE 호출 생략하고 로컬만 clear', async () => {
            TokenManagerMock.getRefresh.mockResolvedValue(null);

            await authService.logout();

            expect(api.post).not.toHaveBeenCalled();
            expect(TokenManagerMock.clear).toHaveBeenCalled();
        });

        test('레거시 userToken + pendingPurposeAfterSignup 키도 정리', async () => {
            TokenManagerMock.getRefresh.mockResolvedValue(null);
            const {unifiedStorage} = require('../../src/common/utils/unifiedStorage');
            (unifiedStorage.removeItem as jest.Mock).mockClear();

            await authService.logout();

            expect(unifiedStorage.removeItem).toHaveBeenCalledWith('userToken');
            expect(unifiedStorage.removeItem).toHaveBeenCalledWith('pendingPurposeAfterSignup');
        });
    });

    // ============ 통합 시나리오 ============
    describe('end-to-end 라이프사이클 시나리오', () => {
        test('로그인 → isAuthenticated true → 로그아웃 → isAuthenticated false', async () => {
            // 로그인 (BE 평탄형 응답)
            const validJwt = makeJwt(Math.floor(Date.now() / 1000) + 3600);
            (api.post as jest.Mock).mockResolvedValueOnce({
                data: {accessToken: validJwt, refreshToken: 'r', userId: 1, userGrade: 'PERSONAL'},
            });
            await authService.login({email: 'a', password: 'p'});

            // 자동 로그인 판정 (토큰 있고 미만료)
            TokenManagerMock.getAccess.mockResolvedValueOnce(validJwt);
            expect(await authService.isAuthenticated()).toBe(true);

            // 로그아웃
            TokenManagerMock.getRefresh.mockResolvedValueOnce('r');
            (api.post as jest.Mock).mockResolvedValueOnce({data: {}});
            await authService.logout();
            expect(TokenManagerMock.clear).toHaveBeenCalled();

            // clear 후 isAuthenticated false
            TokenManagerMock.getAccess.mockResolvedValueOnce(null);
            expect(await authService.isAuthenticated()).toBe(false);
        });
    });
});
