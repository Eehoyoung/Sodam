import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// AttendanceCheckInSheet — recruitment-monetization-gamification-plan.md §5 /
// docs/260801/recruitment-design-artifacts.html "✅ 사장 출석체크" 목업.
// 핵심 검증:
//   1. 이번 주 그리드 7칸 + 완료 요일 체크 렌더
//   2. 오늘이 평일(월~목)이면 지급 프리뷰 +3, 금~일이면 +5
//   3. "출석 체크하기" 탭 → useAttendanceCreditCheckIn 뮤테이션 호출 + 성공 시 결과 상태로 전환
//   4. 7일 연속 출석 완주 보너스 응답이면 보너스 배너 노출
//   5. 409(이미 체크인) → 토스트 안내 + 시트 닫힘
//   6. 그 외 에러 → 에러 토스트만, 시트는 유지(결과 상태로 전환되지 않음)

const mockMutateAsync = jest.fn();
const mockOnClose = jest.fn();
let mockIsPending = false;

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

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/recruitment/hooks/useAttendanceCreditQueries', () => ({
    useAttendanceCreditCheckIn: () => ({mutateAsync: mockMutateAsync, isPending: mockIsPending}),
}));

import {AttendanceCheckInSheet} from '../../../src/features/recruitment/components/AttendanceCheckInSheet';
import {AppToast} from '../../../src/common/components/ds';
import type {AttendanceCreditSummary} from '../../../src/features/recruitment/types';

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

function makeSummary(overrides: Partial<AttendanceCreditSummary> = {}): AttendanceCreditSummary {
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

describe('AttendanceCheckInSheet', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsPending = false;
    });

    test('이번 주 그리드 7칸 렌더 + 오늘(목요일, 평일)은 지급 프리뷰 +3개', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={makeSummary()} />,
            );
            await flush();
        });

        for (const day of ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']) {
            expect(() => findHostByTestId(renderer!, `attendance-checkin-day-${day}`)).not.toThrow();
        }

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toContain('오늘 받는 출근권 +3개');
    });

    test('오늘이 금요일(주말 구간)이면 지급 프리뷰 +5개', async () => {
        const summary = makeSummary({
            weeklyGrid: [
                {date: '2026-08-03', dayOfWeek: 'MON', checkedIn: true, isToday: false},
                {date: '2026-08-04', dayOfWeek: 'TUE', checkedIn: true, isToday: false},
                {date: '2026-08-05', dayOfWeek: 'WED', checkedIn: true, isToday: false},
                {date: '2026-08-06', dayOfWeek: 'THU', checkedIn: true, isToday: false},
                {date: '2026-08-07', dayOfWeek: 'FRI', checkedIn: false, isToday: true},
                {date: '2026-08-08', dayOfWeek: 'SAT', checkedIn: false, isToday: false},
                {date: '2026-08-09', dayOfWeek: 'SUN', checkedIn: false, isToday: false},
            ],
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={summary} />,
            );
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toContain('오늘 받는 출근권 +5개');
    });

    test('"출석 체크하기" 탭 → 뮤테이션 호출 + 성공 시 결과 상태로 전환("확인" 버튼)', async () => {
        mockMutateAsync.mockResolvedValue({
            grantedQuantity: 3,
            streakBonusGranted: false,
            streakBonusQuantity: 0,
            balance: 21,
            currentStreak: 4,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={makeSummary()} />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'attendance-checkin-button').props.onPress();
            await flush();
        });

        expect(mockMutateAsync).toHaveBeenCalledTimes(1);

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toEqual(expect.arrayContaining(['오늘 받은 출근권 +3개']));
        expect(texts).toContain('확인');

        const button = findHostByTestId(renderer!, 'attendance-checkin-button');
        expect(button.props.accessibilityState.disabled).toBe(true);
    });

    test('7일 연속 출석 완주 보너스 응답 → 보너스 배너 노출', async () => {
        mockMutateAsync.mockResolvedValue({
            grantedQuantity: 5,
            streakBonusGranted: true,
            streakBonusQuantity: 10,
            balance: 37,
            currentStreak: 7,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={makeSummary()} />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'attendance-checkin-button').props.onPress();
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'attendance-checkin-streak-banner')).not.toThrow();
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts.some(t => typeof t === 'string' && t.includes('보너스 +10개'))).toBe(true);
    });

    test('409(이미 오늘 체크인) 응답 → 안내 토스트 + 시트 닫힘', async () => {
        const showSpy = jest.spyOn(AppToast, 'show').mockImplementation(() => {});
        mockMutateAsync.mockRejectedValue({response: {status: 409}});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={makeSummary()} />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'attendance-checkin-button').props.onPress();
            await flush();
        });

        expect(showSpy).toHaveBeenCalledWith('오늘은 이미 출석 체크를 완료했어요.');
        expect(mockOnClose).toHaveBeenCalled();

        showSpy.mockRestore();
    });

    test('그 외 에러(500) → 에러 토스트만 노출, 결과 상태로 전환되지 않고 시트는 유지', async () => {
        const errorSpy = jest.spyOn(AppToast, 'error').mockImplementation(() => {});
        mockMutateAsync.mockRejectedValue({response: {status: 500}});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <AttendanceCheckInSheet visible onClose={mockOnClose} summary={makeSummary()} />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'attendance-checkin-button').props.onPress();
            await flush();
        });

        expect(errorSpy).toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();

        const button = findHostByTestId(renderer!, 'attendance-checkin-button');
        expect(button.props.accessibilityState.disabled).toBe(false);

        errorSpy.mockRestore();
    });
});
