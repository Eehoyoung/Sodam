import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Platform} from 'react-native';
import LoginScreen from '../../src/features/auth/screens/LoginScreen';
import {appleAuth} from '@invertase/react-native-apple-authentication';

const mockAppleLogin = jest.fn(() => Promise.resolve({id: 9, name: 'Kim', email: 'kim@example.com'}));

jest.mock('../../src/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        isAuthenticated: false,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        kakaoLogin: jest.fn(),
        appleLogin: mockAppleLogin,
    }),
}));

jest.mock('../../src/navigation/authFlow', () => ({
    resetToRootRoute: jest.fn(),
    resolvePostAuthRoute: jest.fn(() => ({name: 'Home'})),
    pendingSlugToPurpose: jest.fn(() => undefined),
    hasServerRole: jest.fn(() => true),
}));

jest.mock('../../src/common/utils/unifiedStorage', () => ({
    unifiedStorage: {
        getItem: jest.fn(() => Promise.resolve(null)),
        removeItem: jest.fn(() => Promise.resolve()),
    },
}));

describe('LoginScreen — Sign in with Apple (iOS 전용)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('iOS(jest 기본 Platform.OS)에서는 Apple 버튼이 보이고, 탭하면 네이티브 시트 → appleLogin 순으로 호출된다', async () => {
        const navigation = {navigate: jest.fn()} as any;
        const route = {params: {}} as any;

        let renderer: TestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = TestRenderer.create(<LoginScreen navigation={navigation} route={route} />);
        });

        const appleButtonText = renderer!.root.findAllByProps({children: 'Apple로 계속'});
        expect(appleButtonText.length).toBeGreaterThan(0);

        // AppButton은 텍스트를 여러 겹 래핑하므로, onPress 함수를 가진 첫 조상까지 올라간다.
        let node: any = appleButtonText[0];
        while (node && typeof node.props?.onPress !== 'function') {
            node = node.parent;
        }
        expect(node).toBeTruthy();

        await act(async () => {
            await node.props.onPress();
        });

        expect(appleAuth.performRequest).toHaveBeenCalledWith({
            requestedOperation: appleAuth.Operation.LOGIN,
            requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
        });
        expect(mockAppleLogin).toHaveBeenCalledWith('mock-identity-token');
    });

    test('Android에서는 Apple 버튼을 노출하지 않는다 (iOS 전용 요건)', async () => {
        const originalOS = Platform.OS;
        (Platform as any).OS = 'android';

        const navigation = {navigate: jest.fn()} as any;
        const route = {params: {}} as any;

        let renderer: TestRenderer.ReactTestRenderer;
        await act(async () => {
            renderer = TestRenderer.create(<LoginScreen navigation={navigation} route={route} />);
        });

        expect(renderer!.root.findAllByProps({children: 'Apple로 계속'})).toHaveLength(0);

        (Platform as any).OS = originalOS;
    });
});
