import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobSeekerListScreen — 260711_작업통합.md Part 2 §7.4 / §8.3 (Phase 4).
// 핵심 검증:
//   1. 목록 렌더 — 이름/거리/휴직중 뱃지/업종일치 뱃지/오늘가능 뱃지 노출
//   2. 빈 상태("반경 4km 안에 구직중인 분이 아직 없어요")
//   3. STORE_LOCATION_NOT_SET(400) → 위치 설정 유도 분기
//   4. 유형 필터 세그먼트 전환 시 workType 이 useJobSeekers 훅에 그대로 전달(이중래핑 없이)
//   5. 카드 탭 → JobSeekerDetail push (storeId + seeker 그대로 전달, 추가 API 호출 없음)
//
// JobSeekingSettingsScreen.test.tsx 와 동일하게 훅 모듈을 목(mock)해 화면 로직만 결정적으로 검증한다.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRefetch = jest.fn();
const mockUseJobSeekers = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    Switch: 'Switch',
    TextInput: 'TextInput',
    Modal: 'Modal',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useNavigation: () => ({
            navigate: mockNavigate,
            goBack: mockGoBack,
        }),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
        useRoute: () => ({params: {storeId: 10}}),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

const mockMyJobPostingRefetch = jest.fn();
const mockStoreApplicationsRefetch = jest.fn();

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useJobSeekers: (...args: any[]) => mockUseJobSeekers(...args),
    // OurPostingScreen('우리 공고·지원자' 탭)은 조건부 마운트되지만 훅 계약은 여기서도 필요하다.
    useMyJobPosting: () => ({data: null, isLoading: false, refetch: mockMyJobPostingRefetch}),
    useUpsertJobPosting: () => ({mutateAsync: jest.fn(), isPending: false}),
    useStoreJobApplications: () => ({
        data: [],
        isLoading: false,
        isError: false,
        refetch: mockStoreApplicationsRefetch,
    }),
    useRespondToJobApplication: () => ({mutateAsync: jest.fn(), isPending: false}),
}));

import JobSeekerListScreen from '../../../src/features/recruitment/screens/JobSeekerListScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

function makeSeeker(overrides: Record<string, any> = {}) {
    return {
        userId: 1,
        name: '김구직',
        age: 28,
        currentEmployment: null,
        desiredLocations: ['서울 중구 A', '서울 중구 B'],
        seekingTypes: ['SUBSTITUTE'],
        jobCategories: ['CAFE'],
        categoryMatched: true,
        availability: [{day: 'MONDAY', startTime: '10:00:00', endTime: '18:00:00'}],
        availableToday: true,
        distanceMeters: 1234,
        ...overrides,
    };
}

// AppText/AppButton/AppCard 등 DS 컴포지트는 testID prop 을 내부 host 엘리먼트에 그대로
// 스프레드하므로 findAllByProps 는 (컴포지트 + host) 2개가 매치될 수 있다 — onPress 등 실제
// 상호작용 프로퍼티를 가진 host 노드만 골라 반환한다.
const findHostByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

describe('JobSeekerListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseJobSeekers.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });
    });

    test('목록 렌더 — 이름/거리/휴직중 뱃지/업종일치/오늘가능 노출', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: [makeSeeker()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        const flat = texts.flat().filter(t => typeof t === 'string');
        expect(flat.some(t => t.includes('김구직'))).toBe(true);
        expect(flat.some(t => t.includes('28세'))).toBe(true);
        expect(flat).toEqual(expect.arrayContaining(['휴직중', '업종 일치', '오늘 가능', '1.2km']));

        expect(() => findHostByTestId(renderer!, 'job-seeker-list')).not.toThrow();
    });

    test('빈 상태 — "반경 4km 안에 구직중인 분이 아직 없어요"', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: [],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('반경 4km 안에 구직중인 분이 아직 없어요');
        expect(() => findHostByTestId(renderer!, 'job-seeker-list-empty')).not.toThrow();
    });

    test('STORE_LOCATION_NOT_SET(400) → 위치 설정 유도 분기 + 이동', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: {response: {status: 400, data: {errorCode: 'STORE_LOCATION_NOT_SET'}}},
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('매장 위치를 먼저 설정해 주세요');
        expect(texts).toContain('위치 설정하러 가기');

        // ErrorState 의 primary CTA(AppButton)는 컨테이너 안의 유일한 accessibilityRole='button'
        // Pressable(host) 이다 — onPress 를 직접 호출해 StoreEdit 이동을 검증한다.
        const container = findHostByTestId(renderer!, 'job-seeker-location-not-set');
        const ctaButton = container
            .findAllByProps({accessibilityRole: 'button'})
            .find(n => typeof n.props.onPress === 'function');
        expect(ctaButton).toBeTruthy();

        await act(async () => {
            ctaButton!.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('StoreEdit', {storeId: 10});
    });

    test('일반 에러(위치 미설정 아님) → 다시 시도 CTA', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
            error: {response: {status: 500, data: {}}},
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('불러오지 못했어요');
        expect(texts).not.toContain('매장 위치를 먼저 설정해 주세요');
    });

    test('유형 필터 세그먼트 전환 시 workType 이 이중래핑 없이 훅으로 전달된다', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: [makeSeeker()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        // 초기 렌더 — 전체(필터 없음)
        expect(mockUseJobSeekers).toHaveBeenLastCalledWith(10, undefined);

        // 유형 필터 세그먼트(전체/당일 대타/정기) 중 "당일 대타"(index 1) 탭.
        const segments = renderer!.root.findAllByProps({accessibilityRole: 'tablist'});
        const typeSegment = segments[1]; // topSegment 가 0번째, typeSegment 가 1번째
        const tabs = typeSegment.findAllByProps({accessibilityRole: 'tab'});

        await act(async () => {
            tabs[1].props.onPress();
            await flush();
        });

        expect(mockUseJobSeekers).toHaveBeenLastCalledWith(10, {workType: 'SUBSTITUTE'});
    });

    test('카드 탭 → JobSeekerDetail push, 라우트 파라미터로 리스트 항목 그대로 전달(추가 API 호출 없음)', async () => {
        const seeker = makeSeeker();
        mockUseJobSeekers.mockReturnValue({
            data: [seeker],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        const card = findHostByTestId(renderer!, `job-seeker-card-${seeker.userId}`);
        await act(async () => {
            card.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('JobSeekerDetail', {storeId: 10, seeker});
    });

    test('세그먼트 전환 시 refetch — "우리 공고·지원자"로 갔다가 "주변 구직자"로 돌아오면 재조회된다(§10 Phase6)', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: [makeSeeker()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        // 최초 마운트 시 useFocusEffect + topTab 초기값('nearby') 진입 효과로 이미 1회 이상 호출됨.
        const callsAfterMount = mockRefetch.mock.calls.length;
        expect(callsAfterMount).toBeGreaterThan(0);

        const topSegment = renderer!.root.findAllByProps({accessibilityRole: 'tablist'})[0];
        const topTabs = topSegment.findAllByProps({accessibilityRole: 'tab'});

        // '우리 공고·지원자'(index 1)로 전환 — OurPostingScreen 이 마운트되며 자체 useFocusEffect 로
        // useMyJobPosting/useStoreJobApplications refetch 가 실행된다.
        await act(async () => {
            topTabs[1].props.onPress();
            await flush();
        });
        expect(mockMyJobPostingRefetch).toHaveBeenCalled();
        expect(mockStoreApplicationsRefetch).toHaveBeenCalled();

        // 다시 '주변 구직자'(index 0)로 돌아오면 useJobSeekers.refetch 가 추가로 호출돼야 한다.
        const topSegmentAgain = renderer!.root.findAllByProps({accessibilityRole: 'tablist'})[0];
        const topTabsAgain = topSegmentAgain.findAllByProps({accessibilityRole: 'tab'});
        await act(async () => {
            topTabsAgain[0].props.onPress();
            await flush();
        });

        expect(mockRefetch.mock.calls.length).toBeGreaterThan(callsAfterMount);
    });

    // 회귀 테스트(Phase 7 E2E 검증에서 발견): ScreenContainer 에 scroll prop 이 없으면 본문이
    // 고정 View 에 렌더돼 뷰포트를 넘는 콘텐츠(구직자 여러 명, 우리 공고 폼의 시급/메시지/저장
    // 버튼, 지원자 리스트)에 스크롤로 도달할 수 없다 — 실기기에서 재현(에뮬레이터 E2E).
    test('본문이 ScrollView 로 감싸져 있다 — 리스트/폼 콘텐츠가 뷰포트를 넘어도 스크롤로 도달 가능해야 함', async () => {
        mockUseJobSeekers.mockReturnValue({
            data: [makeSeeker()],
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockRefetch,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerListScreen />);
            await flush();
        });

        expect(renderer!.root.findAllByType('ScrollView').length).toBeGreaterThan(0);
    });
});
