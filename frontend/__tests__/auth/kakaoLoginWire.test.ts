import authService from '../../src/features/auth/services/authService';
import {__testing__} from '../../src/common/api/client';
import TokenManager from '../../src/common/auth/tokenStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AxiosMockAdapter = require('axios-mock-adapter');

// [Test Mapping] C-1 — authService.kakaoLogin 이 실제 HTTP 요청에 code/state 를 쿼리로,
// codeVerifier 를 X-Kakao-OAuth-Code-Verifier 헤더로 싣는지 검증한다.
// 기존 테스트는 api 모듈 자체를 mock 해 이 depth(= api.get 의 2/3번째 인자 계약)를
// 건너뛰었고, 그래서 파라미터 이중래핑 버그를 잡지 못했다.
describe('authService.kakaoLogin wire contract', () => {
    beforeEach(async () => {
        await TokenManager.clear();
    });

    it('code/state 를 쿼리로, codeVerifier 를 커스텀 헤더로 전송한다', async () => {
        const client = __testing__.getClient();
        const mock = new AxiosMockAdapter(client);

        let captured: any = null;
        mock.onGet('/kakao/auth/proc').reply((config: any) => {
            captured = config;
            return [200, {
                success: true, message: 'ok',
                data: {accessToken: 'a1', refreshToken: 'r1', userId: 7, userGrade: 'ROLE_EMPLOYEE'},
            }];
        });

        await authService.kakaoLogin({code: 'CODE_1', state: 'STATE_1', codeVerifier: 'VERIFIER_1'});

        expect(captured).not.toBeNull();
        expect(captured.params).toEqual({code: 'CODE_1', state: 'STATE_1'});
        expect(captured.headers['X-Kakao-OAuth-Code-Verifier']).toBe('VERIFIER_1');

        mock.restore();
    });
});
