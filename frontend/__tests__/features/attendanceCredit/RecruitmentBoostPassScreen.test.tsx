import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    Dimensions: {get: () => ({width: 375, height: 812})},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useNavigation: () => ({
            navigate: mockNavigate,
            goBack: mockGoBack,
        }),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/common/config/env', () => ({
    env: {tossClientKey: 'live_ck_test'},
    isTossLive: jest.fn(() => true),
}));

const mockGetMe = jest.fn();
const mockCreateOrder = jest.fn();
const mockConfirmOrder = jest.fn();
let mockReadiness = {mode: 'LIVE', successUrl: 'https://pay/success', failUrl: 'https://pay/fail'};
jest.mock('../../../src/features/attendanceCredit/services/recruitmentBoostPassApi', () => {
    const api = {
        getMe: (...args: any[]) => mockGetMe(...args),
        createOrder: (...args: any[]) => mockCreateOrder(...args),
        confirmOrder: (...args: any[]) => mockConfirmOrder(...args),
        myOrders: jest.fn(),
    };
    return {__esModule: true, default: api};
});

jest.mock('../../../src/features/attendanceCredit/hooks/useRecruitmentBoostPassPaymentReadiness', () => ({
    useRecruitmentBoostPassPaymentReadiness: () => ({data: mockReadiness, isLoading: false}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import RecruitmentBoostPassScreen from '../../../src/features/attendanceCredit/screens/RecruitmentBoostPassScreen';
import {isTossLive} from '../../../src/common/config/env';

const INACTIVE_SUMMARY = {
    active: false,
    activeUntil: null,
    remainingDays: 0,
    products: [
        {code: 'THREE_DAY', displayName: '3일권', durationDays: 3, priceKrw: 9900},
        {code: 'SEVEN_DAY', displayName: '7일권', durationDays: 7, priceKrw: 17900},
        {code: 'THIRTY_DAY', displayName: '30일권', durationDays: 30, priceKrw: 49900},
    ],
};

const ACTIVE_SUMMARY = {
    ...INACTIVE_SUMMARY,
    active: true,
    activeUntil: '2026-08-09T10:00:00',
    remainingDays: 5,
};

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('RecruitmentBoostPassScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetMe.mockResolvedValue(INACTIVE_SUMMARY);
        (isTossLive as jest.Mock).mockReturnValue(true);
        mockReadiness = {mode: 'LIVE', successUrl: 'https://pay/success', failUrl: 'https://pay/fail'};
    });

    test('마운트 시 GET /me 를 조회한다', async () => {
        await act(async () => {
            ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });
        expect(mockGetMe).toHaveBeenCalledTimes(1);
    });

    test('3개 상품 카드가 모두 렌더링된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toEqual(expect.arrayContaining(['3일권', '7일권', '30일권']));
    });

    test('활성 패스가 있으면 D-day 히어로 카드가 렌더링되고, 상품 CTA가 "구독 연장하기"로 바뀐다', async () => {
        mockGetMe.mockResolvedValue(ACTIVE_SUMMARY);
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContainEqual(['D-', 5]);
        const extendButtons = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityLabel === '구독 연장하기');
        expect(extendButtons.length).toBe(3); // 3개 상품 카드 모두 CTA가 "연장"으로 통일된다
    });

    test('상품 카드 "구독하기" 탭 → 주문 생성 후 결제 화면으로 navigate', async () => {
        mockCreateOrder.mockResolvedValue({
            id: 1, orderId: 'RBP_1_abc', productCode: 'THREE_DAY', orderName: '채용 부스트 3일권',
            amountKrw: 9900, durationDays: 3, status: 'PENDING', paidAt: null,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });

        const buyButtons = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityLabel === '구독하기');
        expect(buyButtons.length).toBeGreaterThan(0);

        await act(async () => {
            buyButtons[0].props.onPress();
            await flush();
        });

        expect(mockCreateOrder).toHaveBeenCalledWith('THREE_DAY');
        expect(mockNavigate).toHaveBeenCalledWith('RecruitmentBoostPassPayment', {
            orderId: 'RBP_1_abc',
            amountKrw: 9900,
            orderName: '채용 부스트 3일권',
        });
    });

    test('서버 LIVE인데 토스 라이브 키가 아니면 주문 생성·승인·navigate 하지 않는다', async () => {
        (isTossLive as jest.Mock).mockReturnValue(false);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });

        const buyButtons = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityLabel === '구독하기');

        await act(async () => {
            buyButtons[0].props.onPress();
            await flush();
        });

        expect(mockCreateOrder).not.toHaveBeenCalled();
        expect(mockConfirmOrder).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('서버 MOCK이고 토스 라이브 키가 아니면 모의 주문을 서버에서 승인한다', async () => {
        (isTossLive as jest.Mock).mockReturnValue(false);
        mockReadiness = {mode: 'MOCK', successUrl: 'sodam://success', failUrl: 'sodam://fail'};
        mockCreateOrder.mockResolvedValue({orderId: 'RBP_1_mock', amountKrw: 9900, orderName: '채용 부스트 3일권'});
        mockConfirmOrder.mockResolvedValue({orderId: 'RBP_1_mock', status: 'PAID'});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });
        const buyButton = renderer!.root.findAllByType('Pressable')
            .find(p => p.props.accessibilityLabel === '구독하기')!;
        await act(async () => {
            buyButton.props.onPress();
            await flush();
        });

        expect(mockCreateOrder).toHaveBeenCalledWith('THREE_DAY');
        expect(mockConfirmOrder).toHaveBeenCalledWith('RBP_1_mock', 'mock_RBP_1_mock', 9900);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test.each([
        ['서버 MOCK인데 클라이언트가 실키면', true, {mode: 'MOCK', successUrl: 'sodam://success', failUrl: 'sodam://fail'}],
        ['서버 LIVE인데 콜백 URL이 없으면', true, {mode: 'LIVE', successUrl: null, failUrl: null}],
    ])('%s 주문 생성·승인·navigate 하지 않는다', async (_label, liveKey, readiness) => {
        (isTossLive as jest.Mock).mockReturnValue(liveKey);
        mockReadiness = readiness as typeof mockReadiness;

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });
        const buyButton = renderer!.root.findAllByType('Pressable')
            .find(p => p.props.accessibilityLabel === '구독하기')!;
        await act(async () => {
            buyButton.props.onPress();
            await flush();
        });

        expect(mockCreateOrder).not.toHaveBeenCalled();
        expect(mockConfirmOrder).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('세그먼트 탭에서 "충전소"를 선택하면 AttendanceCreditCharge 로 navigate 한다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<RecruitmentBoostPassScreen />);
            await flush();
        });

        const tabs = renderer!.root.findAllByProps({accessibilityRole: 'tab'});
        const chargeTab = tabs.find(t => t.findAllByType('Text').some(txt => txt.props.children === '충전소'));
        expect(chargeTab).toBeTruthy();

        await act(async () => {
            chargeTab!.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('AttendanceCreditCharge');
    });
});
