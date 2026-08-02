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

const mockGetSummary = jest.fn();
const mockGetChargeCatalog = jest.fn();
const mockCreateChargeOrder = jest.fn();
jest.mock('../../../src/features/attendanceCredit/services/attendanceCreditApi', () => {
    const api = {
        getChargeCatalog: (...args: any[]) => mockGetChargeCatalog(...args),
        createChargeOrder: (...args: any[]) => mockCreateChargeOrder(...args),
        confirmCharge: jest.fn(),
        myChargeOrders: jest.fn(),
    };
    return {__esModule: true, default: api};
});

// 잔액 요약은 Phase A/B 소유 서비스(features/recruitment)를 그대로 재사용하므로 그쪽을 mock한다.
jest.mock('../../../src/features/recruitment/services/attendanceCreditService', () => ({
    __esModule: true,
    default: {
        getMySummary: (...args: any[]) => mockGetSummary(...args),
        checkIn: jest.fn(),
    },
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import AttendanceCreditChargeScreen from '../../../src/features/attendanceCredit/screens/AttendanceCreditChargeScreen';
import {isTossLive} from '../../../src/common/config/env';

const CATALOG = {
    packs: [
        {code: 'SMALL', displayName: '스몰 팩', creditQuantity: 10, ticketQuantity: 0, priceKrw: 1900, popular: false},
        {code: 'MEDIUM', displayName: '미디엄 팩', creditQuantity: 50, ticketQuantity: 0, priceKrw: 7900, popular: true},
        {code: 'LARGE', displayName: '라지 팩', creditQuantity: 120, ticketQuantity: 0, priceKrw: 15900, popular: false},
        {code: 'STREAK_RECOVERY', displayName: '스트릭 복구권', creditQuantity: 0, ticketQuantity: 1, priceKrw: 900, popular: false},
    ],
    firstPurchaseBonusAvailable: true,
    firstPurchaseBonusMultiplier: 2,
    promoCopyEnabled: true,
};

const SUMMARY = {balance: 7, expiringThisWeek: 3, currentStreak: 2, checkedInToday: true, weeklyGrid: []};

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('AttendanceCreditChargeScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetSummary.mockResolvedValue(SUMMARY);
        mockGetChargeCatalog.mockResolvedValue(CATALOG);
        (isTossLive as jest.Mock).mockReturnValue(true);
    });

    test('마운트 시 잔액 요약 + 충전 카탈로그를 함께 조회한다', async () => {
        await act(async () => {
            ReactTestRenderer.create(<AttendanceCreditChargeScreen />);
            await flush();
        });
        expect(mockGetSummary).toHaveBeenCalledTimes(1);
        expect(mockGetChargeCatalog).toHaveBeenCalledTimes(1);
    });

    test('잔액과 이번 주 소멸 예정 배너가 렌더링된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargeScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContainEqual(['7', '개']);
        expect(texts.some((c: any) => Array.isArray(c) && c.join('').includes('이번 주') && c.join('').includes('소멸'))).toBe(true);
    });

    test('4개 상품 카드가 모두 렌더링되고 미디엄 팩에 "가장 인기" 배지가 붙는다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargeScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toEqual(expect.arrayContaining(['스몰 팩', '미디엄 팩', '라지 팩', '스트릭 복구권']));
        expect(texts).toContain('가장 인기');
    });

    test('상품 카드 "구매하기" 탭 → 주문 생성 후 결제 화면으로 navigate', async () => {
        mockCreateChargeOrder.mockResolvedValue({
            id: 1, orderId: 'ACC_1_abc', packCode: 'SMALL', orderName: '스몰 팩',
            amountKrw: 1900, creditQuantity: 10, bonusCreditQuantity: 0, ticketQuantity: 0,
            status: 'PENDING', paidAt: null,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargeScreen />);
            await flush();
        });

        const buyButtons = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityLabel === '구매하기');
        expect(buyButtons.length).toBeGreaterThan(0);

        await act(async () => {
            buyButtons[0].props.onPress();
            await flush();
        });

        expect(mockCreateChargeOrder).toHaveBeenCalledWith('SMALL');
        expect(mockNavigate).toHaveBeenCalledWith('AttendanceCreditChargePayment', {
            orderId: 'ACC_1_abc',
            amountKrw: 1900,
            orderName: '스몰 팩',
        });
    });

    test('토스 라이브 키가 아니면(테스트 키) 결제창 대신 안내만 하고 navigate 하지 않는다', async () => {
        (isTossLive as jest.Mock).mockReturnValue(false);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditChargeScreen />);
            await flush();
        });

        const buyButtons = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityLabel === '구매하기');

        await act(async () => {
            buyButtons[0].props.onPress();
            await flush();
        });

        expect(mockCreateChargeOrder).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
