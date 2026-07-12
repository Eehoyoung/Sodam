import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobOfferInboxScreen — [직원] 채용함 (260711_작업통합.md Part 2 §15.5 R-12/R-13 + §19.4, Phase 6).
// 핵심 검증:
//   1. 받은 제안 + 내 지원 현황을 한 화면에서 통합 노출, 상태 뱃지가 정확
//   2. 빈 상태(둘 다 없음)
//   3. 대기중 제안 수락 탭 → useRespondToJobOffer 뮤테이션 호출
//   4. 수락된 제안/지원(storeCode 있음) → 초대코드 카드 + "매장 가입하기" → JoinStoreByCode 이동

const mockNavigate = jest.fn();
const mockRespondMutateAsync = jest.fn();
const mockOffersRefetch = jest.fn();
const mockApplicationsRefetch = jest.fn();

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

const mockOffersState: {data: any[]; isLoading: boolean; isError: boolean} = {
    data: [],
    isLoading: false,
    isError: false,
};
const mockApplicationsState: {data: any[]; isLoading: boolean; isError: boolean} = {
    data: [],
    isLoading: false,
    isError: false,
};

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useMyJobOffers: () => ({
        data: mockOffersState.data,
        isLoading: mockOffersState.isLoading,
        isError: mockOffersState.isError,
        refetch: mockOffersRefetch,
    }),
    useMyJobApplications: () => ({
        data: mockApplicationsState.data,
        isLoading: mockApplicationsState.isLoading,
        isError: mockApplicationsState.isError,
        refetch: mockApplicationsRefetch,
    }),
    useRespondToJobOffer: () => ({mutateAsync: mockRespondMutateAsync, isPending: false}),
}));

import JobOfferInboxScreen from '../../../src/features/recruitment/screens/JobOfferInboxScreen';
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

function makeOffer(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        storeId: 7,
        storeName: '소담카페',
        workType: 'SUBSTITUTE',
        workDate: '2026-07-13',
        startTime: '10:00:00',
        endTime: '18:00:00',
        hourlyWage: 10500,
        message: '오늘 대타 가능하세요?',
        status: 'PENDING',
        expiresAt: '2099-01-01T00:00:00',
        createdAt: '2026-07-12T10:00:00',
        respondedAt: null,
        storeCode: null,
        ...overrides,
    };
}

function makeApplication(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        postingId: 3,
        storeId: 8,
        storeName: '소담베이커리',
        workType: 'REGULAR',
        jobCategory: 'BAKERY',
        workDate: null,
        startTime: '09:00:00',
        endTime: '18:00:00',
        hourlyWage: 10000,
        message: null,
        status: 'PENDING',
        createdAt: '2026-07-12T10:00:00',
        respondedAt: null,
        storeCode: null,
        ...overrides,
    };
}

describe('JobOfferInboxScreen', () => {
    // 화면이 1분마다 남은시간 재계산용 setInterval 을 마운트한다 — 테스트마다 렌더러를 unmount 해
    // effect cleanup(clearInterval)이 실행되도록 한다(그렇지 않으면 real timer 가 프로세스를 물고
    // 있어 "Cannot log after tests are done" 잔여 에러가 발생한다).
    let activeRenderer: ReactTestRenderer.ReactTestRenderer | null = null;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOffersState.data = [];
        mockOffersState.isLoading = false;
        mockOffersState.isError = false;
        mockApplicationsState.data = [];
        mockApplicationsState.isLoading = false;
        mockApplicationsState.isError = false;
        mockRespondMutateAsync.mockResolvedValue({});
    });

    afterEach(() => {
        act(() => {
            activeRenderer?.unmount();
        });
        activeRenderer = null;
    });

    test('둘 다 없으면 빈 상태를 렌더한다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobOfferInboxScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(() => findHostByTestId(renderer!, 'job-offer-inbox-empty')).not.toThrow();
    });

    test('받은 제안 + 내 지원 현황이 통합 렌더되고 상태 뱃지가 정확하다', async () => {
        mockOffersState.data = [makeOffer({status: 'PENDING'})];
        mockApplicationsState.data = [makeApplication({status: 'DECLINED'})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobOfferInboxScreen />);
            await flush();
        });
        activeRenderer = renderer;

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        const flat = texts.flat().filter(t => typeof t === 'string');
        expect(flat).toEqual(expect.arrayContaining(['소담카페', '소담베이커리', '대기중', '거절됨']));
        expect(() => findHostByTestId(renderer!, 'job-offer-list')).not.toThrow();
        expect(() => findHostByTestId(renderer!, 'job-application-list')).not.toThrow();
    });

    test('대기중 제안 수락 탭 → useRespondToJobOffer 뮤테이션이 호출된다', async () => {
        mockOffersState.data = [makeOffer({id: 42, status: 'PENDING'})];
        const successSpy = jest.spyOn(AppToast, 'success').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobOfferInboxScreen />);
            await flush();
        });
        activeRenderer = renderer;

        await act(async () => {
            findHostByTestId(renderer!, 'job-offer-accept-42').props.onPress();
            await flush();
        });

        expect(mockRespondMutateAsync).toHaveBeenCalledWith({offerId: 42, accept: true});
        expect(successSpy).toHaveBeenCalledWith('제안을 수락했어요.');

        successSpy.mockRestore();
    });

    test('수락된 제안(storeCode 있음) → 초대코드 카드 + "매장 가입하기" → JoinStoreByCode 이동', async () => {
        mockOffersState.data = [makeOffer({id: 7, status: 'ACCEPTED', storeCode: 'ST1234ABCD'})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobOfferInboxScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(() => findHostByTestId(renderer!, 'job-offer-7-invite-banner')).not.toThrow();
        const joinButton = findHostByTestId(renderer!, 'job-offer-7-join-button');

        await act(async () => {
            joinButton.props.onPress();
            await flush();
        });

        expect(mockNavigate).toHaveBeenCalledWith('JoinStoreByCode');
    });

    test('수락된 지원(storeCode 있음) → 초대코드 카드 노출', async () => {
        mockApplicationsState.data = [makeApplication({id: 9, status: 'ACCEPTED', storeCode: 'ST9999ZZZZ'})];

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobOfferInboxScreen />);
            await flush();
        });
        activeRenderer = renderer;

        expect(() => findHostByTestId(renderer!, 'job-application-9-invite-banner')).not.toThrow();
    });
});
