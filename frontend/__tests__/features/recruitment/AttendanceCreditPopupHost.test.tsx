import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// AttendanceCreditPopupHost — 사장 홈 진입 시 출석체크 팝업 자동 노출 게이트(§5).
// 핵심 검증:
//   1. 요약 데이터가 없으면(로딩 중 등) 아무것도 렌더하지 않는다
//   2. checkedInToday=true 면 팝업을 자동으로 열지 않는다(이미 출석했으므로)
//   3. checkedInToday=false + 오늘 처음이면(로컬에 "노출함" 기록 없음) 팝업을 자동으로 열고,
//      "오늘 이미 노출함" 플래그를 저장한다
//   4. checkedInToday=false 인데 이미 오늘 자동으로 노출한 적이 있으면 다시 열지 않는다(1일 1회)

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();

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

jest.mock('../../../src/common/utils/unifiedStorage', () => ({
    unifiedStorage: {
        getItem: (...args: any[]) => mockGetItem(...args),
        setItem: (...args: any[]) => mockSetItem(...args),
    },
}));

let mockSummaryState: {data: any} = {data: undefined};
jest.mock('../../../src/features/recruitment/hooks/useAttendanceCreditQueries', () => ({
    useAttendanceCreditSummary: () => mockSummaryState,
    useAttendanceCreditCheckIn: () => ({mutateAsync: jest.fn(), isPending: false}),
}));

import {AttendanceCreditPopupHost} from '../../../src/features/recruitment/components/AttendanceCreditPopupHost';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
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

describe('AttendanceCreditPopupHost', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetItem.mockResolvedValue(null);
        mockSetItem.mockResolvedValue(undefined);
        mockSummaryState = {data: undefined};
    });

    test('요약 데이터가 없으면 아무것도 렌더하지 않는다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditPopupHost />);
            await flush();
        });

        expect(renderer!.toJSON()).toBeNull();
        expect(mockGetItem).not.toHaveBeenCalled();
    });

    test('checkedInToday=true 면 팝업을 자동으로 열지 않는다', async () => {
        mockSummaryState = {data: makeSummary({checkedInToday: true})};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditPopupHost />);
            await flush();
        });

        expect(mockGetItem).not.toHaveBeenCalled();
        expect(renderer!.root.findByType('Modal' as any).props.visible).toBe(false);
    });

    test('checkedInToday=false + 오늘 처음이면 팝업을 자동으로 열고 "오늘 노출함" 플래그를 저장한다', async () => {
        mockGetItem.mockResolvedValue(null); // 아직 오늘 노출한 적 없음
        mockSummaryState = {data: makeSummary({checkedInToday: false})};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditPopupHost />);
            await flush();
        });

        expect(mockGetItem).toHaveBeenCalledWith('attendanceCreditPopupShown:2026-08-06');
        expect(mockSetItem).toHaveBeenCalledWith('attendanceCreditPopupShown:2026-08-06', '1');
        expect(renderer!.root.findByType('Modal' as any).props.visible).toBe(true);
    });

    test('checkedInToday=false 인데 오늘 이미 자동으로 노출한 적이 있으면 다시 열지 않는다(1일 1회)', async () => {
        mockGetItem.mockResolvedValue('1'); // 오늘 이미 노출함
        mockSummaryState = {data: makeSummary({checkedInToday: false})};

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCreditPopupHost />);
            await flush();
        });

        expect(mockGetItem).toHaveBeenCalledWith('attendanceCreditPopupShown:2026-08-06');
        expect(mockSetItem).not.toHaveBeenCalled();
        expect(renderer!.root.findByType('Modal' as any).props.visible).toBe(false);
    });
});
