import {getKakaoCodeFromUrl, hasKakaoError} from '../../src/features/auth/screens/KakaoLoginScreen';

describe('KakaoLoginScreen redirect parsing', () => {
    test('success redirect extracts authorization code', () => {
        expect(getKakaoCodeFromUrl('sodam://auth/kakao?code=abc%20123')).toBe('abc 123');
    });

    test('cancel or failure redirect is detected', () => {
        expect(hasKakaoError('sodam://auth/kakao?error=access_denied')).toBe(true);
        expect(hasKakaoError('sodam://auth/kakao?code=ok')).toBe(false);
    });
});
