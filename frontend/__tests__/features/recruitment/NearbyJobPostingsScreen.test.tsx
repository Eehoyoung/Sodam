import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// NearbyJobPostingsScreen — [직원] 주변 구인 (260711_작업통합.md Part 2 §19.4 R-16, Phase 6).
// 핵심 검증:
//   1. 리스트 렌더 — 매장명/유형/업종/시급/거리 노출
//   2. 빈 상태
//   3. 희망지역 미설정(JOB_SEEKING_LOCATIONS_REQUIRED) → 안내 + 구직 설정 탭 이동 콜백
//   4. 유형 필터 세그먼트 전환 시 workType 이 이중래핑 없이 훅으로 전달
//   5. 카드 탭 → JobPostingDetail push(항목 그대로 전달)

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
const mockUseNearbyJobPostings = jest.fn();
const mockOnGoToProfileTab = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate}),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useNearbyJobPostings: (...args: any[]) => mockUseNearbyJobPostings(...args),
}));

import NearbyJobPostingsScreen from '../../../src/features/recruitment/screens/NearbyJobPostingsScreen';

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

function makePosting(overrides: Record<string, any> = {}) {
    return {
        postingId: 1,
        storeId: 7,
        storeName: '소담카페',
        workType: 'SUBSTITUTE',
        jobCategory: 'CAFE',
        workDate: '2026-07-13',
        startTime: '10:00:00',
        endTime: '18:00:00',
        hourlyWage: 10500,
        message: '오늘 저녁 대타 구해요',
        distanceMeters: 1500,
        ...overrides,
    };
}

describe('NearbyJobPostingsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseNearbyJobPostings.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });
    });

    test('리스트 렌더 — 매장명/유형/업종/시급/거리 노출', async () => {
        mockUseNearbyJobPostings.mockReturnValue({
            data: [makePosting()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <NearbyJobPostingsScreen onGoToProfileTab={mockOnGoToProfileTab} />,
            );
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        const flat = texts.flat().filter(t => typeof t === 'string');
        expect(flat.some(t => t.includes('소담카페'))).toBe(true);
        expect(flat).toEqual(expect.arrayContaining(['당일 대타', '카페', '1.5km']));
        expect(() => findHostByTestId(renderer!, 'nearby-posting-list')).not.toThrow();
    });

    test('빈 상태 — "반경 4km 안에 열린 공고가 없어요"', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <NearbyJobPostingsScreen onGoToProfileTab={mockOnGoToProfileTab} />,
            );
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('반경 4km 안에 열린 공고가 없어요');
        expect(() => findHostByTestId(renderer!, 'nearby-posting-empty')).not.toThrow();
    });

    test('희망지역 미설정 → 안내 + 구직 설정 탭 이동 콜백', async () => {
        mockUseNearbyJobPostings.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: {response: {status: 400, data: {errorCode: 'JOB_SEEKING_LOCATIONS_REQUIRED'}}},
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <NearbyJobPostingsScreen onGoToProfileTab={mockOnGoToProfileTab} />,
            );
            await flush();
        });

        const container = findHostByTestId(renderer!, 'nearby-posting-locations-required');
        const ctaButton = container
            .findAllByProps({accessibilityRole: 'button'})
            .find(n => typeof n.props.onPress === 'function');
        expect(ctaButton).toBeTruthy();

        await act(async () => {
            ctaButton!.props.onPress();
            await flush();
        });

        expect(mockOnGoToProfileTab).toHaveBeenCalledTimes(1);
    });

    test('유형 필터 세그먼트 전환 시 workType 이 이중래핑 없이 훅으로 전달된다', async () => {
        mockUseNearbyJobPostings.mockReturnValue({
            data: [makePosting()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <NearbyJobPostingsScreen onGoToProfileTab={mockOnGoToProfileTab} />,
            );
            await flush();
        });

        expect(mockUseNearbyJobPostings).toHaveBeenLastCalledWith({workType: undefined, category: undefined});

        const segments = renderer!.root.findAllByProps({accessibilityRole: 'tablist'});
        const typeSegment = segments[0];
        const tabs = typeSegment.findAllByProps({accessibilityRole: 'tab'});

        await act(async () => {
            tabs[1].props.onPress(); // "당일 대타"
            await flush();
        });

        expect(mockUseNearbyJobPostings).toHaveBeenLastCalledWith({workType: 'SUBSTITUTE', category: undefined});
    });

    test('카드 탭 → JobPostingDetail push, 라우트 파라미터로 항목 그대로 전달', async () => {
        const posting = makePosting();
        mockUseNearbyJobPostings.mockReturnValue({
            data: [posting],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(
                <NearbyJobPostingsScreen onGoToProfileTab={mockOnGoToProfileTab} />,
            );
            await flush();
        });

        const card = findHostByTestId(renderer!, `nearby-posting-card-${posting.postingId}`);
        await act(async () => {
            card.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('JobPostingDetail', {posting});
    });
});
