import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// OurPostingScreen — [사장] 우리 공고·지원자 (260711_작업통합.md Part 2 §19.4 R-15, Phase 6).
// 핵심 검증:
//   1. 기존 공고가 있으면 upsert 폼이 프리필된다(매장당 1건 수정 폼)
//   2. 저장 탭 → useUpsertJobPosting 뮤테이션이 폼 상태로 호출된다
//   3. 지원자 리스트 렌더(카드 구성) + 수락/거절 탭 → useRespondToJobApplication 뮤테이션 호출

const mockUpsertMutateAsync = jest.fn();
const mockRespondMutateAsync = jest.fn();
const mockPostingRefetch = jest.fn();
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
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

const mockPostingState: {data: any; isLoading: boolean} = {data: null, isLoading: false};
const mockApplicationsState: {data: any[]; isLoading: boolean; isError: boolean} = {
    data: [],
    isLoading: false,
    isError: false,
};

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useMyJobPosting: () => ({
        data: mockPostingState.data,
        isLoading: mockPostingState.isLoading,
        refetch: mockPostingRefetch,
    }),
    useUpsertJobPosting: () => ({mutateAsync: mockUpsertMutateAsync, isPending: false}),
    useStoreJobApplications: () => ({
        data: mockApplicationsState.data,
        isLoading: mockApplicationsState.isLoading,
        isError: mockApplicationsState.isError,
        refetch: mockApplicationsRefetch,
    }),
    useRespondToJobApplication: () => ({mutateAsync: mockRespondMutateAsync, isPending: false}),
}));

import OurPostingScreen from '../../../src/features/recruitment/screens/OurPostingScreen';
import {AppToast} from '../../../src/common/components/ds';

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

describe('OurPostingScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPostingState.data = null;
        mockPostingState.isLoading = false;
        mockApplicationsState.data = [];
        mockApplicationsState.isLoading = false;
        mockApplicationsState.isError = false;
        mockUpsertMutateAsync.mockResolvedValue({});
        mockRespondMutateAsync.mockResolvedValue({});
    });

    // FE-DUP 회귀 테스트(findings_report.md §4.1): 예전에는 `useMyJobPosting`/`useStoreJobApplications`
    // 가 둘 다 `staleTime: 0` 인데도 마운트마다 수동 `useFocusEffect` 로 두 refetch 를 함께 호출해,
    // 마운트 자동조회(useQuery 자체)와 겹쳐 최초 진입 시 API가 최대 4회(공고·지원자 각 2회) 중복
    // 호출됐다(recruitment 도메인 5화면 중 "가장 심함"). 이제 이 화면이 refetch 를 직접 호출하는
    // 경로는 "다시 시도" 에러 CTA(지원자 리스트만) 뿐이므로, 정상 마운트만으로는 절대 호출되지
    // 않아야 한다.
    test('마운트만으로는 postingQuery/applicationsQuery refetch 가 수동 호출되지 않는다(중복 호출 제거)', async () => {
        await act(async () => {
            ReactTestRenderer.create(<OurPostingScreen storeId={7} />);
            await flush();
        });

        expect(mockPostingRefetch).not.toHaveBeenCalled();
        expect(mockApplicationsRefetch).not.toHaveBeenCalled();
    });

    test('기존 공고가 있으면 upsert 폼이 프리필된다', async () => {
        mockPostingState.data = {
            id: 1,
            storeId: 7,
            storeName: '소담카페',
            workType: 'REGULAR',
            jobCategory: 'BAKERY',
            workDate: null,
            startTime: '09:00:00',
            endTime: '18:00:00',
            hourlyWage: 10500,
            message: '주말 근무 가능하신 분',
            open: true,
            createdAt: '',
            updatedAt: '',
        };

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OurPostingScreen storeId={7} />);
            await flush();
        });

        expect(findHostByTestId(renderer!, 'our-posting-type-chip-REGULAR').props.accessibilityState.selected).toBe(true);
        expect(findHostByTestId(renderer!, 'our-posting-category-chip-BAKERY').props.accessibilityState.selected).toBe(true);
        expect(findHostByTestId(renderer!, 'our-posting-start-input').props.value).toBe('0900');
        expect(findHostByTestId(renderer!, 'our-posting-end-input').props.value).toBe('1800');
        expect(findHostByTestId(renderer!, 'our-posting-wage-input').props.value).toBe('10500');
        expect(findHostByTestId(renderer!, 'our-posting-message-input').props.value).toBe('주말 근무 가능하신 분');
        expect(findHostByTestId(renderer!, 'our-posting-open-toggle').props.value).toBe(true);
        // REGULAR 는 근무일 필드가 없다.
        expect(() => findHostByTestId(renderer!, 'our-posting-workdate-input')).toThrow();
    });

    test('저장 탭 → useUpsertJobPosting 뮤테이션이 폼 상태로 호출된다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OurPostingScreen storeId={7} />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'our-posting-category-chip-CAFE').props.onPress();
            findHostByTestId(renderer!, 'our-posting-wage-input').props.onChangeText('9860');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'our-posting-workdate-input').props.onChangeText('20260713');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'our-posting-save-button').props.onPress();
            await flush();
        });

        expect(mockUpsertMutateAsync).toHaveBeenCalledWith({
            workType: 'SUBSTITUTE',
            jobCategory: 'CAFE',
            workDate: '2026-07-13',
            startTime: '09:00:00',
            endTime: '18:00:00',
            hourlyWage: 9860,
            message: undefined,
            open: true,
        });
    });

    test('지원자 리스트가 카드로 렌더되고, 수락 탭 → respond 뮤테이션이 호출된다', async () => {
        mockApplicationsState.data = [
            {
                applicationId: 5,
                applicantUserId: 9,
                applicantName: '박지원',
                age: 24,
                currentEmployment: null,
                message: '지원합니다',
                status: 'PENDING',
                createdAt: '2026-07-12T10:00:00',
                respondedAt: null,
            },
        ];

        const successSpy = jest.spyOn(AppToast, 'success').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OurPostingScreen storeId={7} />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'applicant-card-5')).not.toThrow();

        await act(async () => {
            findHostByTestId(renderer!, 'applicant-accept-5').props.onPress();
            await flush();
        });

        expect(mockRespondMutateAsync).toHaveBeenCalledWith({applicationId: 5, accept: true});
        expect(successSpy).toHaveBeenCalledWith('지원을 수락했어요.');

        successSpy.mockRestore();
    });

    test('지원자가 없으면 빈 상태를 렌더한다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OurPostingScreen storeId={7} />);
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'our-posting-applicants-empty')).not.toThrow();
    });
});
