/**
 * S1 전자 근로계약서 — 화면 스모크.
 * MyContract(직원 목록·서명 라우팅) / ContractSign(서명 제출) / SendContract(사장 발송)
 * 가 크래시 없이 마운트되고 핵심 API 를 올바른 경로로 호출하는지 검증한다.
 */
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: unknown) => s},
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    TextInput: 'TextInput',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: {ios: unknown}) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => {
    // 실제 useFocusEffect 처럼 콜백을 렌더 중이 아닌 effect 로 실행해야 무한 렌더를 막을 수 있다.
    const React = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
        useRoute: () => ({params: mockRouteParams}),
        useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
        NavigationContainer: ({children}: {children: React.ReactNode}) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: {children: React.ReactNode}) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/common/api/client', () => {
    const api = {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn()};
    return {__esModule: true, default: api};
});

import api from '../../../src/common/api/client';
import MyContractScreen from '../../../src/features/contract/screens/MyContractScreen';
import ContractSignScreen from '../../../src/features/contract/screens/ContractSignScreen';
import SendContractScreen from '../../../src/features/contract/screens/SendContractScreen';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('Contract screens smoke', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {};
    });

    test('MyContract: 마운트 시 내 계약서 목록을 조회한다', async () => {
        apiMock.get.mockResolvedValue({data: []} as never);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<MyContractScreen />);
            await flush();
        });

        expect(apiMock.get).toHaveBeenCalledWith('/api/labor-contracts/my');
        expect(renderer).toBeTruthy();
    });

    test('ContractSign: contractId 라우트로 크래시 없이 마운트된다', async () => {
        mockRouteParams = {contractId: 7};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<ContractSignScreen />);
            await flush();
        });

        expect(renderer).toBeTruthy();
    });

    test('SendContract: 마운트 시 매장 직원 목록을 조회한다', async () => {
        mockRouteParams = {storeId: 10, employeeId: 42, employeeName: '김직원'};
        apiMock.get.mockResolvedValue({data: []} as never);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SendContractScreen />);
            await flush();
        });

        expect(apiMock.get).toHaveBeenCalledWith('/api/stores/10/employees');
        expect(renderer).toBeTruthy();
    });
});
