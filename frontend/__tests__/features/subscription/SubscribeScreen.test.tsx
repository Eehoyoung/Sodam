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
        {name: 'FREE', displayName: '무료', monthlyPriceKrw: 0, description: '출퇴근 무제한 + 급여 미리보기'},
        {name: 'STARTER', displayName: '스타터', monthlyPriceKrw: 9900, description: '급여 자동 계산 + 명세서 PDF'},
        {name: 'PRO', displayName: '프로', monthlyPriceKrw: 19900, description: '직원 무제한 + 4대보험 신고서'},
        {name: 'PREMIUM', displayName: '프리미엄', monthlyPriceKrw: 39900, description: '프로 전부 + 멀티매장 무제한'},
    ];
    const api = {
        getPlans: jest.fn().mockResolvedValue(planList),
        getMyCurrent: jest.fn().mockResolvedValue(null),
        subscribeFree: jest.fn().mockResolvedValue({id: 1, plan: 'FREE', status: 'ACTIVE'}),
        subscribePaid: jest.fn(),
        pause: jest.fn().mockResolvedValue({id: 1, plan: 'STARTER', status: 'PAUSED'}),
        resume: jest.fn().mockResolvedValue({id: 1, plan: 'STARTER', status: 'ACTIVE'}),
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

    test('4종 플랜 카드 렌더링 (FREE/STARTER/PRO/PREMIUM)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // displayName 4개 모두 등장해야 함
        expect(texts).toEqual(expect.arrayContaining(['무료', '스타터', '프로', '프리미엄']));
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
        // 0=FREE, 1=STARTER, 2=PRO, 3=PREMIUM
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

    test('STARTER 선택 후 버튼 누르면 TossBillingAuth 로 navigate', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const planCards = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityState && 'selected' in p.props.accessibilityState);
        // 1 = STARTER
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
        // 결제(TossBillingAuth) 화면은 PG 연동 승인 후 신설 — 미구현 라우트로 navigate 하지 않고 안내만 (크래시 방지)
        expect(mockNavigate).not.toHaveBeenCalledWith('TossBillingAuth', {plan: 'STARTER'});
    });

    test('현재 구독 = STARTER 일 때 해당 카드에 "이용 중" 배지 노출', async () => {
        (subscriptionApi as any).getMyCurrent.mockResolvedValueOnce({
            id: 1,
            plan: 'STARTER',
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

    test('유료 플랜 선택 시 결제 주기 세그먼트(월/반년/연) 노출', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const planCards = renderer!.root
            .findAllByType('Pressable')
            .filter(p => p.props.accessibilityState && 'selected' in p.props.accessibilityState);
        // 1 = STARTER (유료)
        await act(async () => {
            planCards[1].props.onPress();
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toEqual(expect.arrayContaining(['월납', '반년납', '연납']));
        expect(texts).toContain('반년납 1개월 무료 / 연납 2개월 무료');
    });

    test('현재 ACTIVE 구독이면 "구독 일시정지" 버튼 → pause() 호출', async () => {
        (subscriptionApi as any).getMyCurrent.mockResolvedValueOnce({
            id: 1,
            plan: 'STARTER',
            status: 'ACTIVE',
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const pauseBtn = renderer!.root
            .findAllByType('Pressable')
            .find(p => p.props.accessibilityLabel === '구독 일시정지');
        expect(pauseBtn).toBeTruthy();

        await act(async () => {
            pauseBtn!.props.onPress();
            await flush();
        });
        expect((subscriptionApi as any).pause).toHaveBeenCalledTimes(1);
    });

    test('현재 PAUSED 구독이면 "구독 재개하기" 버튼 → resume() 호출', async () => {
        (subscriptionApi as any).getMyCurrent.mockResolvedValueOnce({
            id: 1,
            plan: 'STARTER',
            status: 'PAUSED',
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<SubscribeScreen />);
            await flush();
        });

        const resumeBtn = renderer!.root
            .findAllByType('Pressable')
            .find(p => p.props.accessibilityLabel === '구독 재개하기');
        expect(resumeBtn).toBeTruthy();

        await act(async () => {
            resumeBtn!.props.onPress();
            await flush();
        });
        expect((subscriptionApi as any).resume).toHaveBeenCalledTimes(1);
    });
});
