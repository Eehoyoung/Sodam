import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// react-native 확장: Pressable, ActivityIndicator, Alert 추가
jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    // DS v2: ScreenContainer→KeyboardAvoidingView/StatusBar, CtaStack→useWindowDimensions(useResponsive)
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    Dimensions: {get: () => ({width: 375, height: 812})},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

// 네비게이션 mock — 화면별 navigate 추적
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: mockNavigate,
        goBack: jest.fn(),
    }),
    NavigationContainer: ({children}: any) => children,
}));

// SafeAreaView mock — 이미 jest.setup.js 에 있지만 명시
jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    // CtaStack 의 useResponsive 가 useSafeAreaInsets 사용
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

// subscriptionApi mock
jest.mock('../../../src/features/subscription/services/subscriptionApi', () => {
    const planList = [
        {name: 'FREE', displayName: '기본', monthlyPriceKrw: 0, description: '기본 근태/급여'},
        {name: 'BUSINESS', displayName: '비즈니스', monthlyPriceKrw: 15000, description: '근태+급여+명세서'},
        {name: 'PREMIUM', displayName: '프리미엄', monthlyPriceKrw: 50000, description: '세무사 1:1'},
        {name: 'COMMISSION', displayName: '환급형', monthlyPriceKrw: 0, description: '환급 수수료'},
    ];
    const api = {
        getPlans: jest.fn().mockResolvedValue(planList),
        getMyCurrent: jest.fn().mockResolvedValue(null),
        subscribeFree: jest.fn().mockResolvedValue({id: 1, plan: 'FREE', status: 'ACTIVE'}),
        subscribePaid: jest.fn(),
        cancel: jest.fn(),
    };
    return {__esModule: true, default: api, subscriptionApi: api};
});

// 토큰 단순 모킹 — 깊이 있는 색상 객체 의존성 단순화
// 실제 토큰 사용 — DS named export 전체 제공 (부분 모킹 시 import 크래시)
jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import SubscribeScreen from '../../../src/features/subscription/screens/SubscribeScreen';
import subscriptionApi from '../../../src/features/subscription/services/subscriptionApi';

const flush = async () => {
    // Promise.all + .catch 체인 + setState 까지 비우기 위해 다수 라운드
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('SubscribeScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('마운트 시 getPlans() + getMyCurrent() 호출', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });
        expect((subscriptionApi as any).getPlans).toHaveBeenCalledTimes(1);
        expect((subscriptionApi as any).getMyCurrent).toHaveBeenCalledTimes(1);
        expect(renderer).toBeTruthy();
    });

    test('4종 플랜 카드 렌더링 (FREE/BUSINESS/PREMIUM/COMMISSION)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // displayName 4개 모두 등장해야 함
        expect(texts).toEqual(expect.arrayContaining(['기본', '비즈니스', '프리미엄', '환급형']));
    });

    test('FREE 선택 후 버튼 누르면 subscribeFree() 호출', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        // DS v2: 헤더 back(Pressable)·하단 AppButton 도 Pressable 이므로 인덱스로 찾으면 안 된다.
        // 플랜 카드(AppCard)는 accessibilityState.selected 가 정의된 Pressable 이며 플랜 순서대로 렌더.
        const planCards = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityState && 'selected' in p.props.accessibilityState);
        // 0=FREE, 1=BUSINESS, 2=PREMIUM, 3=COMMISSION
        await act(async () => {
            planCards[0].props.onPress();
            await flush();
        });

        // 하단 버튼: title 이 "무료로 시작하기" 인 Pressable
        // Button 의 Pressable 은 accessibilityLabel=title 로 구분
        const afterPressables = renderer!.root.findAllByType('Pressable');
        const subscribeBtn = afterPressables.find(
            p => p.props.accessibilityLabel === '무료로 시작하기',
        );
        expect(subscribeBtn).toBeTruthy();

        await act(async () => {
            subscribeBtn!.props.onPress();
            await flush();
        });
        expect((subscriptionApi as any).subscribeFree).toHaveBeenCalledTimes(1);
    });

    test('BUSINESS 선택 후 버튼 누르면 TossBillingAuth 로 navigate', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const planCards = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityState && 'selected' in p.props.accessibilityState);
        // 1 = BUSINESS
        await act(async () => {
            planCards[1].props.onPress();
            await flush();
        });

        const after = renderer!.root.findAllByType('Pressable');
        const subscribeBtn = after.find(p => p.props.accessibilityLabel === '결제 진행하기');
        expect(subscribeBtn).toBeTruthy();

        await act(async () => {
            subscribeBtn!.props.onPress();
            await flush();
        });
        expect(mockNavigate).toHaveBeenCalledWith('TossBillingAuth', {plan: 'BUSINESS'});
    });

    test('현재 구독 = BUSINESS 일 때 해당 카드에 "이용 중" 배지 노출', async () => {
        (subscriptionApi as any).getMyCurrent.mockResolvedValueOnce({
            id: 1,
            plan: 'BUSINESS',
            status: 'ACTIVE',
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('이용 중');
    });
});
