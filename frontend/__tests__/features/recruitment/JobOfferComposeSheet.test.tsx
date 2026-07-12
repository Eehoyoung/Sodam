import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobOfferComposeSheet — 260711_작업통합.md Part 2 §15.5 R-11 (Phase 6).
// 핵심 검증:
//   1. 열릴 때 오늘(대타 근무일 기본값) 요일의 구직자 가능시간으로 시작/종료 시간이 프리필된다
//   2. 근무일(오늘/내일)을 바꾸면 해당 요일 가능시간으로 재프리필된다
//   3. 구직자의 seekingTypes 에 없는 유형 세그먼트는 비활성 처리되어 선택되지 않는다(§16.2-5)
//   4. 제출 시 useSendJobOffer 뮤테이션이 올바른 payload 로 호출된다

const mockMutateAsync = jest.fn();
const mockOnClose = jest.fn();
const mockOnSent = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    Modal: 'Modal',
    TextInput: 'TextInput',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useSendJobOffer: () => ({mutateAsync: mockMutateAsync, isPending: false}),
}));

import {JobOfferComposeSheet} from '../../../src/features/recruitment/components/JobOfferComposeSheet';
import {AppToast} from '../../../src/common/components/ds';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

// 2026-07-13(월) 00:00 로컬 시각 — 참고: `new Date(2026,6,13)` 은 월요일, 다음날(14일)은 화요일이다.
const MONDAY = new Date(2026, 6, 13);

const seeker = {
    userId: 42,
    name: '김구직',
    age: 28,
    currentEmployment: null as null | {storeName: string; hireDate: string},
    desiredLocations: ['서울 중구 A', '서울 중구 B'],
    seekingTypes: ['SUBSTITUTE'] as const,
    jobCategories: ['CAFE'],
    categoryMatched: true,
    availability: [
        {day: 'MONDAY' as const, startTime: '10:00:00', endTime: '19:00:00'},
        {day: 'TUESDAY' as const, startTime: '11:00:00', endTime: '20:00:00'},
    ],
    availableToday: true,
    distanceMeters: 1234,
};

const findHostByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

describe('JobOfferComposeSheet', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockMutateAsync.mockResolvedValue({
            id: 1,
            storeId: 7,
            storeName: '소담카페',
            status: 'PENDING',
        });
    });

    test('열릴 때 오늘(월요일) 가능시간으로 시작/종료 시간이 프리필된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <JobOfferComposeSheet
                    visible
                    onClose={mockOnClose}
                    storeId={7}
                    seeker={seeker as any}
                    now={MONDAY}
                />,
            );
            await flush();
        });

        expect(findHostByTestId(renderer!, 'job-offer-start-input').props.value).toBe('1000');
        expect(findHostByTestId(renderer!, 'job-offer-end-input').props.value).toBe('1900');
    });

    test('근무일을 내일(화요일)로 바꾸면 화요일 가능시간으로 재프리필된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <JobOfferComposeSheet
                    visible
                    onClose={mockOnClose}
                    storeId={7}
                    seeker={seeker as any}
                    now={MONDAY}
                />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-offer-workdate-chip-TOMORROW').props.onPress();
            await flush();
        });

        expect(findHostByTestId(renderer!, 'job-offer-start-input').props.value).toBe('1100');
        expect(findHostByTestId(renderer!, 'job-offer-end-input').props.value).toBe('2000');
    });

    test('구직자의 seekingTypes 에 없는 유형은 비활성 처리되어 선택되지 않는다(§16.2-5)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <JobOfferComposeSheet
                    visible
                    onClose={mockOnClose}
                    storeId={7}
                    seeker={seeker as any} // seekingTypes = ['SUBSTITUTE'] 만
                    now={MONDAY}
                />,
            );
            await flush();
        });

        const regularChip = findHostByTestId(renderer!, 'job-offer-type-chip-REGULAR');
        expect(regularChip.props.accessibilityState.disabled).toBe(true);

        await act(async () => {
            regularChip.props.onPress();
            await flush();
        });

        // REGULAR 는 비활성이므로 선택되지 않고, 대타 전용 근무일 칩이 여전히 렌더돼야 한다(workType 유지).
        expect(() => findHostByTestId(renderer!, 'job-offer-workdate-chip-TODAY')).not.toThrow();
        const substituteChip = findHostByTestId(renderer!, 'job-offer-type-chip-SUBSTITUTE');
        expect(substituteChip.props.accessibilityState.selected).toBe(true);
    });

    test('제안 보내기 탭 → useSendJobOffer 뮤테이션이 올바른 payload 로 호출되고 시트가 닫힌다', async () => {
        const successSpy = jest.spyOn(AppToast, 'success').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <JobOfferComposeSheet
                    visible
                    onClose={mockOnClose}
                    storeId={7}
                    seeker={seeker as any}
                    now={MONDAY}
                    onSent={mockOnSent}
                />,
            );
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-offer-wage-input').props.onChangeText('10500');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-offer-submit-button').props.onPress();
            await flush();
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({
            targetUserId: 42,
            workType: 'SUBSTITUTE',
            workDate: '2026-07-13',
            startTime: '10:00:00',
            endTime: '19:00:00',
            hourlyWage: 10500,
            message: undefined,
        });
        expect(successSpy).toHaveBeenCalledWith('채용 제안을 보냈어요.');
        expect(mockOnSent).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();

        successSpy.mockRestore();
    });
});
