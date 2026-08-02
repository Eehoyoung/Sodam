import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// AttendanceCreditSummaryCard — 마이페이지 출근권 상시 카드(§5 "상시 접근").
// 핵심 검증:
//   1. 로딩/에러/데이터없음 이면 아무것도 렌더하지 않는다(마이페이지 다른 보조 섹션과 동일 원칙)
//   2. 데이터 로드 시 그라디언트 히어로 카드에 잔액/소멸예정 배지/스트릭 텍스트가 노출된다
//   3. checkedInToday=false 면 "출석 체크하기" CTA 노출, tap 시 AttendanceCheckInSheet 가 열린다
//   4. checkedInToday=true 면 "오늘 출석 완료" 배지가 CTA 대신 노출된다
//   5. 충전소 이동 버튼 탭 → AttendanceCreditCharge 화면으로 navigate(Phase C 연결 완료)

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate}),
}));

const mockMutateAsync = jest.fn();
let mockSummaryState: {data: any; isLoading: boolean; isError: boolean} = {
    data: undefined,
    isLoading: false,
    isError: false,
};

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    Modal: 'Modal',
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/recruitment/hooks/useAttendanceCreditQueries', () => ({
    useAttendanceCreditSummary: () => mockSummaryState,
    useAttendanceCreditCheckIn: () => ({mutateAsync: mockMutateAsync, isPending: false}),
}));

import {AttendanceCreditSummaryCard} from '../../../src/features/recruitment/components/AttendanceCreditSummaryCard';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const findHostByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

function makeSummary(overrides: Record<string, any> = {}) {
    return {
        balance: 18,
        expiringThisWeek: 5,
        currentStreak: 3,
        checkedInToday: false,
        weeklyGrid: [
            {date: '2026-08-03', dayOfWeek: 'MON', checkedIn: true, isToday: false},
            {date: '2026-08-04', dayOfWeek: 'TUE', checkedIn: true, isToday: false},
            {date: '2026-08-05', dayOfWeek: 'WED', checkedIn: true, isToday: false},
            {date: '2026-08-06', dayOfWeek: 'THU', checkedIn: false, isToday: true},
            {date: '2026-08-07', dayOfWeek: 'FRI', checkedIn: false, isToday: false},
            {date: '2026-08-08', dayOfWeek: 'SAT', checkedIn: false, isToday: false},
            {date: '2026-08-09', dayOfWeek: 'SUN', checkedIn: false, isToday: false},
        ],
        ...overrides,
    };
}

describe('AttendanceCreditSummaryCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSummaryState = {data: undefined, isLoading: false, isError: false};
    });

    test('로딩 중이면 아무것도 렌더하지 않는다', async () => {
        mockSummaryState = {data: undefined, isLoading: true, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'attendance-credit-summary-card')).toThrow();
    });

    test('에러이면 아무것도 렌더하지 않는다', async () => {
        mockSummaryState = {data: undefined, isLoading: false, isError: true};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'attendance-credit-summary-card')).toThrow();
    });

    test('데이터 로드 시 잔액/소멸예정/스트릭이 노출된다', async () => {
        mockSummaryState = {data: makeSummary(), isLoading: false, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toContain('18개');
        expect(texts).toContain('⏳ 이번 주 소멸 예정 5개');
        expect(texts).toContain('연속 출석 3일째');
    });

    test('expiringThisWeek=0 이면 소멸예정 배지를 노출하지 않는다', async () => {
        mockSummaryState = {data: makeSummary({expiringThisWeek: 0}), isLoading: false, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts.some(t => typeof t === 'string' && t.includes('소멸 예정'))).toBe(false);
    });

    test('checkedInToday=false 면 "출석 체크하기" CTA 탭 시 출석체크 시트(Modal)가 visible=true 로 전환된다', async () => {
        mockSummaryState = {data: makeSummary({checkedInToday: false}), isLoading: false, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        expect(renderer!.root.findByType('Modal' as any).props.visible).toBe(false);

        await act(async () => {
            findHostByTestId(renderer!, 'attendance-credit-checkin-cta').props.onPress();
            await flush();
        });

        expect(renderer!.root.findByType('Modal' as any).props.visible).toBe(true);
    });

    test('checkedInToday=true 면 CTA 대신 "오늘 출석 완료" 배지를 노출한다', async () => {
        mockSummaryState = {data: makeSummary({checkedInToday: true}), isLoading: false, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'attendance-credit-checkin-cta')).toThrow();
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toContain('오늘 출석 완료');
    });

    test('충전소 이동 버튼 탭 → AttendanceCreditCharge 화면으로 navigate', async () => {
        mockSummaryState = {data: makeSummary(), isLoading: false, isError: false};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditSummaryCard />);
            await flush();
        });

        const chargeBtn = findHostByTestId(renderer!, 'attendance-credit-charge-station-cta');
        expect(chargeBtn.props.accessibilityState?.disabled).not.toBe(true);

        await act(async () => {
            chargeBtn.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('AttendanceCreditCharge');
    });
});
