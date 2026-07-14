import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobSeekingSettingsScreen — 260711_작업통합.md Part 2 §7.3 / §8.3.
// 핵심 검증:
//   1. eligible=false → 구직 토글 비활성 렌더 + 자격 배너 노출
//   2. seeking=true 로 저장 시도 + 희망지역 미충족 → 클라이언트 측 검증 토스트(서버 왕복 차단)
//   3. 업종 칩 4번째 선택 탭 → 무반응 + "최대 3개" 토스트, 카운터는 3/3 유지
//   4. 저장 탭 → updateMyJobSeeking 뮤테이션 호출(payload 정합)
//   5. 요일별 시간 편집 시트의 "모든 선택 요일에 동일 적용" → 선택된 모든 요일에 시간 반영
//
// 실제 TanStack QueryClientProvider + 네트워크 프라미스 체인을 react-test-renderer 로 구동하면
// (React 19 + 이 프로젝트에 아직 없는 신규 패턴) 관측 불가능한 매크로태스크 홉이 섞여 타이밍이
// 불안정해진다 — `useMyJobSeeking`/`useUpdateMyJobSeeking` 훅 모듈을 직접 목(mock)해 화면 로직만
// 결정적으로 검증한다(서비스 레이어 자체는 recruitmentService.test.ts 에서 별도 검증됨).

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockAddListenerUnsub = jest.fn();
const mockAddListener = jest.fn(() => mockAddListenerUnsub);
const mockRefetch = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Modal: 'Modal',
    Switch: 'Switch',
    TextInput: 'TextInput',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useNavigation: () => ({
            navigate: jest.fn(),
            goBack: mockGoBack,
            dispatch: mockDispatch,
            addListener: mockAddListener,
        }),
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
        useRoute: () => ({params: {}}),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

// 훅 모듈 자체를 목 — 화면은 이 훅이 반환하는 data/isLoading/isError/refetch 와
// mutateAsync/isPending 만으로 렌더/검증을 결정하므로, 실제 TanStack Query 왕복 없이
// 결정적으로 상태를 주입할 수 있다.
const mockQueryState: {data: any; isLoading: boolean; isError: boolean} = {
    data: undefined,
    isLoading: false,
    isError: false,
};
const mockMutationState: {isPending: boolean} = {isPending: false};

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useMyJobSeeking: () => ({
        data: mockQueryState.data,
        isLoading: mockQueryState.isLoading,
        isError: mockQueryState.isError,
        refetch: mockRefetch,
    }),
    useUpdateMyJobSeeking: () => ({
        mutateAsync: mockMutateAsync,
        isPending: mockMutationState.isPending,
    }),
}));

import JobSeekingSettingsScreen from '../../../src/features/recruitment/screens/JobSeekingSettingsScreen';
import {AppToast, ConfirmSheet} from '../../../src/common/components/ds';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

function makeProfile(overrides: Record<string, any> = {}) {
    return {
        eligible: true,
        seeking: false,
        locations: [],
        seekingTypes: [],
        jobCategories: [],
        availability: [],
        currentEmployment: null,
        ...overrides,
    };
}

// AppText/AppButton/AppInput/AppCard 등 DS 컴포지트는 testID prop 을 내부 host 엘리먼트에
// 그대로 스프레드하므로 findByProps 는 (컴포지트 + host) 2개가 매치돼 예외를 던진다.
// 실제 onPress/onChangeText/children 등 상호작용 프로퍼티를 가진 host 노드만 골라 반환한다.
const findByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

describe('JobSeekingSettingsScreen', () => {
    let warnSpy: jest.SpyInstance;
    let successSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQueryState.data = undefined;
        mockQueryState.isLoading = false;
        mockQueryState.isError = false;
        mockMutationState.isPending = false;
        mockMutateAsync.mockResolvedValue(makeProfile());
        warnSpy = jest.spyOn(AppToast, 'warn').mockImplementation(() => {});
        successSpy = jest.spyOn(AppToast, 'success').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
        successSpy.mockRestore();
    });

    // FE-DUP 회귀 테스트(findings_report.md §4.1): 예전에는 `useMyJobSeeking` 이 `staleTime: 30s`
    // 인데도 이 탭(허브 기본 탭)에 마운트마다 수동 `useFocusEffect(refetch)` 가 있어 staleTime 설정을
    // 무시하고 항상 강제 재조회했다. 이제 이 화면이 refetch 를 직접 호출하는 경로는 "다시 시도"
    // 에러 CTA 뿐이므로, 정상 마운트만으로는 절대 호출되지 않아야 한다.
    test('마운트만으로는 refetch 가 수동 호출되지 않는다(중복 호출 제거)', async () => {
        mockQueryState.data = makeProfile({eligible: true});

        await act(async () => {
            ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        expect(mockRefetch).not.toHaveBeenCalled();
    });

    test('eligible=false 이면 구직 토글이 비활성화되고 자격 배너가 노출된다', async () => {
        mockQueryState.data = makeProfile({eligible: false});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        const toggle = findByTestId(renderer!, 'job-seeking-toggle');
        expect(toggle.props.disabled).toBe(true);

        // 자격 배너는 eligible=false 일 때만 존재해야 한다.
        expect(() => findByTestId(renderer!, 'job-seeking-eligibility-banner')).not.toThrow();
    });

    test('eligible=true 이면 토글이 활성화되고 자격 배너가 없다', async () => {
        mockQueryState.data = makeProfile({eligible: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        const toggle = findByTestId(renderer!, 'job-seeking-toggle');
        expect(toggle.props.disabled).toBe(false);
        expect(() => findByTestId(renderer!, 'job-seeking-eligibility-banner')).toThrow();
    });

    test('구직 ON 시도 + 희망지역 미충족 → 저장 차단 + 검증 토스트(서버 왕복 없음)', async () => {
        mockQueryState.data = makeProfile({eligible: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        // 구직 ON + 유형/업종/요일 최소조건은 채우되 희망지역은 비워둔다.
        await act(async () => {
            findByTestId(renderer!, 'job-seeking-toggle').props.onValueChange(true);
            findByTestId(renderer!, 'job-seeking-type-chip-SUBSTITUTE').props.onPress();
            findByTestId(renderer!, 'job-seeking-category-chip-CAFE').props.onPress();
            findByTestId(renderer!, 'job-seeking-day-chip-MONDAY').props.onPress();
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-save-button').props.onPress();
            await flush();
        });

        expect(warnSpy).toHaveBeenCalledWith('희망지역을 2곳 모두 선택해 주세요.');
        expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    test('업종 칩 4번째 선택 탭 → 무반응 + "최대 3개" 토스트, 카운터는 3/3 유지', async () => {
        mockQueryState.data = makeProfile({eligible: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-category-chip-CAFE').props.onPress();
            findByTestId(renderer!, 'job-seeking-category-chip-BAKERY').props.onPress();
            findByTestId(renderer!, 'job-seeking-category-chip-RESTAURANT_HALL').props.onPress();
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-category-chip-KITCHEN').props.onPress();
            await flush();
        });

        expect(warnSpy).toHaveBeenCalledWith('업종은 최대 3개까지 선택할 수 있어요.');
        const counter = findByTestId(renderer!, 'job-seeking-category-counter');
        expect(counter.props.children).toEqual(expect.arrayContaining([3, '/', 3]));
    });

    test('저장 탭 → updateMyJobSeeking 뮤테이션이 폼 상태 그대로 호출된다', async () => {
        const existing = makeProfile({
            eligible: true,
            seeking: false,
            locations: [{address: '서울 중구 A'}, {address: '서울 중구 B'}],
            seekingTypes: ['SUBSTITUTE'],
            jobCategories: ['CAFE'],
            availability: [{day: 'MONDAY', startTime: '10:00:00', endTime: '18:00:00'}],
        });
        mockQueryState.data = existing;

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-save-button').props.onPress();
            await flush();
        });

        expect(mockMutateAsync).toHaveBeenCalledWith({
            seeking: false,
            locationAddresses: ['서울 중구 A', '서울 중구 B'],
            seekingTypes: ['SUBSTITUTE'],
            jobCategories: ['CAFE'],
            availability: [{day: 'MONDAY', startTime: '10:00:00', endTime: '18:00:00'}],
        });
        expect(successSpy).toHaveBeenCalled();
    });

    test('요일별 시간 편집 시트 "모든 선택 요일에 동일 적용" → 선택된 모든 요일에 시간 반영', async () => {
        mockQueryState.data = makeProfile({eligible: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        // 월/화 요일을 켠다(기본값 09:00~18:00 부여).
        await act(async () => {
            findByTestId(renderer!, 'job-seeking-day-chip-MONDAY').props.onPress();
            findByTestId(renderer!, 'job-seeking-day-chip-TUESDAY').props.onPress();
            await flush();
        });

        // 켜진 월요일을 다시 탭 → 시간 편집 시트 오픈.
        await act(async () => {
            findByTestId(renderer!, 'job-seeking-day-chip-MONDAY').props.onPress();
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-sheet-start-input').props.onChangeText('1000');
            findByTestId(renderer!, 'job-seeking-sheet-end-input').props.onChangeText('1900');
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-apply-all-days-button').props.onPress();
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        const occurrences = texts.filter(t => t === '10:00~19:00').length;
        expect(occurrences).toBe(2); // 월/화 두 요일 모두 반영
    });

    test('구직 유형 미선택 상태로 저장 시도 → 클라이언트 측 안내(서버 왕복 없음)', async () => {
        // 희망지역·업종·요일은 미리 채워 "구직 유형 미선택" 조건만 단독으로 검증한다.
        mockQueryState.data = makeProfile({
            eligible: true,
            locations: [{address: '서울 중구 A'}, {address: '서울 중구 B'}],
            jobCategories: ['CAFE'],
            availability: [{day: 'MONDAY', startTime: '09:00:00', endTime: '18:00:00'}],
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-toggle').props.onValueChange(true);
            await flush();
        });

        await act(async () => {
            findByTestId(renderer!, 'job-seeking-save-button').props.onPress();
            await flush();
        });

        expect(warnSpy).toHaveBeenCalledWith('구직 유형을 1개 이상 선택해 주세요.');
        expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    test('BACK 키(beforeRemove) 이탈 시 미저장 변경이 있으면 확인 시트로 막는다', async () => {
        mockQueryState.data = makeProfile({eligible: true});
        const confirmSpy = jest.spyOn(ConfirmSheet, 'confirm').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekingSettingsScreen />);
            await flush();
        });

        // 아직 미저장 변경이 없는 시점 — beforeRemove 는 이탈을 막지 않아야 한다.
        const [, initialHandler] = mockAddListener.mock.calls[mockAddListener.mock.calls.length - 1];
        const cleanEvent = {preventDefault: jest.fn(), data: {action: {type: 'GO_BACK'}}};
        act(() => {
            initialHandler(cleanEvent);
        });
        expect(cleanEvent.preventDefault).not.toHaveBeenCalled();

        // 카테고리 칩 하나를 선택해 dirty=true 로 전환 → beforeRemove 리스너가 재등록된다.
        await act(async () => {
            findByTestId(renderer!, 'job-seeking-category-chip-CAFE').props.onPress();
            await flush();
        });

        const [, dirtyHandler] = mockAddListener.mock.calls[mockAddListener.mock.calls.length - 1];
        const dirtyEvent = {preventDefault: jest.fn(), data: {action: {type: 'GO_BACK'}}};
        act(() => {
            dirtyHandler(dirtyEvent);
        });

        expect(dirtyEvent.preventDefault).toHaveBeenCalled();
        expect(confirmSpy).toHaveBeenCalledWith(
            expect.objectContaining({title: expect.stringContaining('저장하지 않고 나갈까요')}),
        );

        confirmSpy.mockRestore();
    });
});
