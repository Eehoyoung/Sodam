import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Linking} from 'react-native';
import KakaoLoginScreen, {getKakaoCodeFromUrl, hasKakaoError} from '../../src/features/auth/screens/KakaoLoginScreen';

// WP-00 계약 기준선: 정식 redirect URI는 `sodam://oauth/kakao` (c2977e6, common/config/env.ts
// kakaoRedirectUri, iOS Info.plist / Android AndroidManifest.xml intent-filter와 3자 일치).
// 과거 fixture(`sodam://auth/kakao`, oauth 세그먼트 없음)는 실제 등록된 스킴이 아니므로 교체한다.
const VALID_REDIRECT = 'sodam://oauth/kakao';

const mockKakaoLogin = jest.fn(() => Promise.resolve({id: 1, name: 'Kim'}));

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        kakaoLogin: mockKakaoLogin,
        appleLogin: jest.fn(),
    }),
}));

jest.mock('../../src/navigation/authFlow', () => ({
    resetToRootRoute: jest.fn(),
    resolvePostAuthRoute: jest.fn(() => ({name: 'Home'})),
    pendingSlugToPurpose: jest.fn(() => undefined),
    hasServerRole: jest.fn(() => true),
}));

jest.mock('../../src/features/auth/services/authApi', () => ({
    __esModule: true,
    default: {
        openKakaoLogin: jest.fn(() => Promise.resolve()),
    },
}));

describe('KakaoLoginScreen redirect parsing', () => {
    test('success redirect extracts authorization code', () => {
        expect(getKakaoCodeFromUrl(`${VALID_REDIRECT}?code=abc%20123`)).toBe('abc 123');
    });

    test('cancel or failure redirect is detected', () => {
        expect(hasKakaoError(`${VALID_REDIRECT}?error=access_denied`)).toBe(true);
        expect(hasKakaoError(`${VALID_REDIRECT}?code=ok`)).toBe(false);
    });

    test('파서는 scheme/path 에 무관하게 code/error 쿼리만 본다 (경로 drift에 안전)', () => {
        // 과거 fixture 경로였던 /auth/kakao 로 들어와도 code 파싱 자체는 깨지지 않는다 —
        // 다만 실제 OS가 앱으로 되돌려주는 경로는 iOS/Android 설정에 등록된 VALID_REDIRECT 뿐이다.
        expect(getKakaoCodeFromUrl('sodam://auth/kakao?code=legacy')).toBe('legacy');
    });
});

describe('KakaoLoginScreen — foreground/cold-start 복귀 (sodam://oauth/kakao)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockKakaoLogin.mockResolvedValue({id: 1, name: 'Kim'} as any);
        (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
        (Linking.addEventListener as jest.Mock).mockReturnValue({remove: jest.fn()});
    });

    const navigation = {navigate: jest.fn()} as any;
    const route = {params: {}} as any;

    test('cold-start: 앱이 종료된 상태에서 정식 리다이렉트 URI로 열리면 getInitialURL 결과로 로그인을 완료한다', async () => {
        (Linking.getInitialURL as jest.Mock).mockResolvedValue(`${VALID_REDIRECT}?code=coldstart123`);

        await act(async () => {
            TestRenderer.create(React.createElement(KakaoLoginScreen, {navigation, route}));
            // useEffect 내부의 getInitialURL().then(handleUrl) 마이크로태스크 flush
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(mockKakaoLogin).toHaveBeenCalledWith('coldstart123');
    });

    test('foreground: 브라우저에서 앱으로 돌아오는 url 이벤트로 로그인을 완료한다', async () => {
        let urlListener: ((event: {url: string}) => void) | undefined;
        (Linking.addEventListener as jest.Mock).mockImplementation((_event: string, cb: any) => {
            urlListener = cb;
            return {remove: jest.fn()};
        });

        await act(async () => {
            TestRenderer.create(React.createElement(KakaoLoginScreen, {navigation, route}));
            await Promise.resolve();
        });

        expect(urlListener).toBeDefined();

        await act(async () => {
            urlListener!({url: `${VALID_REDIRECT}?code=foreground456`});
            await Promise.resolve();
        });

        expect(mockKakaoLogin).toHaveBeenCalledWith('foreground456');
    });

    test('foreground: error 쿼리가 오면 kakaoLogin을 호출하지 않는다(취소/실패 경로)', async () => {
        let urlListener: ((event: {url: string}) => void) | undefined;
        (Linking.addEventListener as jest.Mock).mockImplementation((_event: string, cb: any) => {
            urlListener = cb;
            return {remove: jest.fn()};
        });

        await act(async () => {
            TestRenderer.create(React.createElement(KakaoLoginScreen, {navigation, route}));
            await Promise.resolve();
        });

        await act(async () => {
            urlListener!({url: `${VALID_REDIRECT}?error=access_denied`});
            await Promise.resolve();
        });

        expect(mockKakaoLogin).not.toHaveBeenCalled();
    });
});
