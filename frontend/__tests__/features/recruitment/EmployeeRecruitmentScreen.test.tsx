import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// EmployeeRecruitmentScreen — [직원] 채용 허브 (260711_작업통합.md Part 2 §19.4, Phase 6).
// 핵심 검증: 세그먼트 전환(구직 설정 ↔ 주변 구인 ↔ 채용함) 시 각 탭이 조건부 마운트/언마운트되며,
// 그때마다 해당 탭의 데이터가 재조회된다(§10 Phase6 "세그먼트 전환마다 refetch" 신규 확정 패턴).
// 탭 컴포넌트 자체는 개별 테스트 파일에서 이미 검증했으므로, 여기서는 허브가 탭을 스위칭할 때
// 각 탭의 refetch 훅이 호출되는지만 훅을 목(mock)해 결정적으로 확인한다.

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockJobSeekingRefetch = jest.fn();
const mockMutateAsync = jest.fn();
const mockNearbyRefetch = jest.fn();
const mockOffersRefetch = jest.fn();
const mockApplicationsRefetch = jest.fn();

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
        useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack, addListener: () => () => {}}),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
        useRoute: () => ({params: {}}),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/store/components/AddressSearchModal', () => 'AddressSearchModal');

// `data` 참조가 매 렌더마다 바뀌면 안 된다 — JobSeekingSettingsScreen 의
// `useEffect(() => {...}, [data, dirty])` 가 참조 동일성을 기준으로 동작하므로, 매번 새 객체를
// 주면 렌더 → effect 실행 → setState → 재렌더 → effect 재실행의 무한 루프가 발생한다. jest.mock
// 팩토리 클로저 안에서 고정 참조를 한 번만 만들어 재사용한다(팩토리 바깥 변수는 "mock" 접두사가
// 없으면 호이스팅 규칙 위반이라 접근 불가 — 이 패턴으로 그 제약도 함께 피한다).
jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => {
    const jobSeekingProfileFixture = {
        eligible: true,
        seeking: false,
        locations: [],
        seekingTypes: [],
        jobCategories: [],
        availability: [],
        currentEmployment: null,
    };
    const emptyList: any[] = [];

    return {
        useMyJobSeeking: () => ({
            data: jobSeekingProfileFixture,
            isLoading: false,
            isError: false,
            refetch: mockJobSeekingRefetch,
        }),
        useUpdateMyJobSeeking: () => ({mutateAsync: mockMutateAsync, isPending: false}),
        useNearbyJobPostings: () => ({
            data: emptyList,
            isLoading: false,
            isError: false,
            error: undefined,
            refetch: mockNearbyRefetch,
        }),
        useMyJobOffers: () => ({data: emptyList, isLoading: false, isError: false, refetch: mockOffersRefetch}),
        useMyJobApplications: () => ({
            data: emptyList,
            isLoading: false,
            isError: false,
            refetch: mockApplicationsRefetch,
        }),
        useRespondToJobOffer: () => ({mutateAsync: jest.fn(), isPending: false}),
    };
});

import EmployeeRecruitmentScreen from '../../../src/features/recruitment/screens/EmployeeRecruitmentScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('EmployeeRecruitmentScreen', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        act(() => {
            renderer?.unmount();
        });
        renderer = null;
    });

    test('세그먼트 전환마다 각 탭의 데이터가 재조회된다(구직 설정 → 주변 구인 → 채용함 → 구직 설정)', async () => {
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeRecruitmentScreen />);
            await flush();
        });

        // 최초 마운트('구직 설정' 탭) — JobSeekingSettingsScreen 의 useFocusEffect 로 1회 이상 호출.
        expect(mockJobSeekingRefetch.mock.calls.length).toBeGreaterThan(0);
        expect(mockNearbyRefetch).not.toHaveBeenCalled();

        const segment = renderer!.root.findAllByProps({accessibilityRole: 'tablist'})[0];

        // '주변 구인'(index 1) 으로 전환 — NearbyJobPostingsScreen 마운트.
        await act(async () => {
            segment.findAllByProps({accessibilityRole: 'tab'})[1].props.onPress();
            await flush();
        });
        expect(mockNearbyRefetch.mock.calls.length).toBeGreaterThan(0);

        // '채용함'(index 2) 으로 전환 — JobOfferInboxScreen 마운트.
        await act(async () => {
            renderer!.root.findAllByProps({accessibilityRole: 'tablist'})[0]
                .findAllByProps({accessibilityRole: 'tab'})[2].props.onPress();
            await flush();
        });
        expect(mockOffersRefetch.mock.calls.length).toBeGreaterThan(0);
        expect(mockApplicationsRefetch.mock.calls.length).toBeGreaterThan(0);

        // 다시 '구직 설정'(index 0) 으로 돌아오면 JobSeekingSettingsScreen 이 재마운트되어
        // refetch 가 한 번 더 호출된다(최초 마운트 호출 수보다 커야 함).
        const callsBeforeReturn = mockJobSeekingRefetch.mock.calls.length;
        await act(async () => {
            renderer!.root.findAllByProps({accessibilityRole: 'tablist'})[0]
                .findAllByProps({accessibilityRole: 'tab'})[0].props.onPress();
            await flush();
        });
        expect(mockJobSeekingRefetch.mock.calls.length).toBeGreaterThan(callsBeforeReturn);
    });
});
