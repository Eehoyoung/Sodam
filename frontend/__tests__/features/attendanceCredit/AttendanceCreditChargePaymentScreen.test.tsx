import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    Dimensions: {get: () => ({width: 375, height: 812})},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockGoBack = jest.fn();
const routeParams = {orderId: 'ACC_1_abc', amountKrw: 1900, orderName: '스몰 팩'};
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack, navigate: jest.fn()}),
    useRoute: () => ({params: routeParams}),
    NavigationContainer: ({children}: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

// jest.setup.js 가 react-native-webview 를 전역 mock 하지만(WebView: 'WebView'), 이 파일에서
// require() 로 다시 가져오는 loadWebView() 동작을 명시적으로 고정한다.
jest.mock('react-native-webview', () => ({WebView: 'WebView'}));

const mockConfirmCharge = jest.fn();
jest.mock('../../../src/features/attendanceCredit/services/attendanceCreditApi', () => ({
    __esModule: true,
    default: {
        getSummary: jest.fn(),
        getChargeCatalog: jest.fn(),
        createChargeOrder: jest.fn(),
        confirmCharge: (...args: any[]) => mockConfirmCharge(...args),
        myChargeOrders: jest.fn(),
    },
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import AttendanceCreditChargePaymentScreen from '../../../src/features/attendanceCredit/screens/AttendanceCreditChargePaymentScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('AttendanceCreditChargePaymentScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('WebView 로 결제창을 마운트한다(react-native-webview 설치됨 가정)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargePaymentScreen />);
            await flush();
        });
        const webviews = renderer!.root.findAllByType('WebView' as any);
        expect(webviews.length).toBe(1);
    });

    test('결제 성공 리다이렉트(paymentKey 포함) 감지 시 confirmCharge 호출', async () => {
        mockConfirmCharge.mockResolvedValue({status: 'PAID'});
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargePaymentScreen />);
            await flush();
        });

        const webview = renderer!.root.findAllByType('WebView' as any)[0];
        const shouldStart = webview.props.onShouldStartLoadWithRequest;

        await act(async () => {
            shouldStart({
                url: 'https://sodam.local/attendance-credit-charge/success?paymentKey=PK_1&orderId=ACC_1_abc&amount=1900',
            });
            await flush();
        });

        expect(mockConfirmCharge).toHaveBeenCalledWith('ACC_1_abc', 'PK_1', 1900);
    });

    test('결제 실패/취소 리다이렉트 감지 시 confirmCharge 를 호출하지 않고 뒤로 간다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargePaymentScreen />);
            await flush();
        });

        const webview = renderer!.root.findAllByType('WebView' as any)[0];
        const shouldStart = webview.props.onShouldStartLoadWithRequest;

        await act(async () => {
            shouldStart({url: 'https://sodam.local/attendance-credit-charge/fail?message=cancelled'});
            await flush();
        });

        expect(mockConfirmCharge).not.toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
    });
});
