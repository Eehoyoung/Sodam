import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';
import {resolvePostAuthRoute, resetToRootRoute} from '../../src/navigation/authFlow';

/**
 * 이메일 로그인 성공 후 <b>랜딩 배선</b> 검증.
 *
 * <p>"어느 화면으로 가야 하는가"라는 결정 자체는 순수 함수 {@code resolvePostAuthRoute} 의 몫이고
 * {@code __tests__/navigation/authFlow.test.ts} 가 역할·동의·개인모드 조합을 이미 덮는다.
 * 여기서는 그 결정을 <b>화면이 실제로 사용하는지</b>만 본다 — 결정이 옳아도 화면이 그 결과를
 * 무시하면 랜딩은 깨진다.</p>
 *
 * <p>이전 버전은 `HomeRoot` + `params.screen === 'MasterMyPageScreen'` 처럼 화면 이름을 직접
 * 단언했는데, 그 계약은 authFlow 리팩터링으로 사라졌다. 화면 이름을 두 곳에서 단언하면 랜딩
 * 규칙이 바뀔 때마다 무관한 테스트가 깨진다.</p>
 */

const mockLogin = jest.fn();

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: mockLogin,
        logout: jest.fn(),
        kakaoLogin: jest.fn(),
        appleLogin: jest.fn(),
    }),
}));

jest.mock('../../src/navigation/authFlow', () => ({
    resetToRootRoute: jest.fn(),
    resolvePostAuthRoute: jest.fn(),
    pendingSlugToPurpose: jest.fn(() => undefined),
    hasServerRole: jest.fn(() => true),
}));

jest.mock('../../src/common/utils/unifiedStorage', () => ({
    unifiedStorage: {
        getItem: jest.fn(() => Promise.resolve(null)),
        removeItem: jest.fn(() => Promise.resolve()),
    },
}));

const mockedResolve = resolvePostAuthRoute as unknown as jest.Mock;
const mockedReset = resetToRootRoute as unknown as jest.Mock;

const renderLogin = () =>
    render(<LoginScreen navigation={{navigate: jest.fn()} as any} route={{params: {}} as any} />);

const submitLogin = (utils: ReturnType<typeof renderLogin>) => {
    fireEvent.changeText(utils.getByPlaceholderText('이메일'), 'owner@sodam.com');
    fireEvent.changeText(utils.getByPlaceholderText('비밀번호'), 'password');
    fireEvent.press(utils.getByText('로그인'));
};

describe('로그인 후 랜딩 배선', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('로그인에 성공하면 인증된 사용자로 랜딩 경로를 계산한다', async () => {
        const loggedInUser = {id: 1, role: 'MASTER'};
        mockLogin.mockResolvedValueOnce(loggedInUser);
        mockedResolve.mockReturnValue({name: 'HomeRoot', params: {screen: 'MasterHome'}});

        submitLogin(renderLogin());

        await waitFor(() => {
            expect(mockedResolve).toHaveBeenCalledWith(loggedInUser, undefined);
        });
    });

    it('계산된 경로 그대로 루트를 reset 한다 — 화면이 결정을 무시하지 않는다', async () => {
        const route = {name: 'HomeRoot', params: {screen: 'EmployeeHome'}};
        mockLogin.mockResolvedValueOnce({id: 2, role: 'EMPLOYEE'});
        mockedResolve.mockReturnValue(route);

        submitLogin(renderLogin());

        await waitFor(() => {
            expect(mockedReset).toHaveBeenCalledTimes(1);
        });
        expect(mockedReset.mock.calls[0][1]).toBe(route);
    });

    it('로그인에 실패하면 랜딩을 시도하지 않는다', async () => {
        mockLogin.mockRejectedValueOnce({response: {status: 401}});

        submitLogin(renderLogin());

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalled();
        });
        expect(mockedReset).not.toHaveBeenCalled();
    });
});
