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
const routeParams = {orderId: 'RBP_1_abc', amountKrw: 9900, orderName: '채용 부스트 3일권'};
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

const mockConfirmOrder = jest.fn();
jest.mock('../../../src/features/attendanceCredit/services/recruitmentBoostPassApi', () => ({
    __esModule: true,
    default: {
        getMe: jest.fn(),
        createOrder: jest.fn(),
        confirmOrder: (...args: any[]) => mockConfirmOrder(...args),
        myOrders: jest.fn(),
    },
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import RecruitmentBoostPassPaymentScreen from '../../../src/features/attendanceCredit/screens/RecruitmentBoostPassPaymentScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('RecruitmentBoostPassPaymentScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('WebView 로 결제창을 마운트한다(react-native-webview 설치됨 가정)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassPaymentScreen />);
            await flush();
        });
        const webviews = renderer!.root.findAllByType('WebView' as any);
        expect(webviews.length).toBe(1);
    });

    test('결제 성공 리다이렉트(paymentKey 포함) 감지 시 confirmOrder 호출', async () => {
        mockConfirmOrder.mockResolvedValue({status: 'PAID'});
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassPaymentScreen />);
            await flush();
        });

        const webview = renderer!.root.findAllByType('WebView' as any)[0];
        const shouldStart = webview.props.onShouldStartLoadWithRequest;

        await act(async () => {
            shouldStart({
                url: 'https://sodam.local/recruitment-boost-pass/success?paymentKey=PK_1&orderId=RBP_1_abc&amount=9900',
            });
            await flush();
        });

        expect(mockConfirmOrder).toHaveBeenCalledWith('RBP_1_abc', 'PK_1', 9900);
    });

    test('결제 실패/취소 리다이렉트 감지 시 confirmOrder 를 호출하지 않고 뒤로 간다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassPaymentScreen />);
            await flush();
        });

        const webview = renderer!.root.findAllByType('WebView' as any)[0];
        const shouldStart = webview.props.onShouldStartLoadWithRequest;

        await act(async () => {
            shouldStart({url: 'https://sodam.local/recruitment-boost-pass/fail?message=cancelled'});
            await flush();
        });

        expect(mockConfirmOrder).not.toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
    });
});
