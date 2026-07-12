import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobPostingDetailScreen — [직원] 구인 공고 상세·지원 (260711_작업통합.md Part 2 §19.4 R-17, Phase 6).
// 핵심 검증:
//   1. 라우트 파라미터(posting)만으로 렌더 — 추가 API 호출 없음
//   2. "지원하기" 탭 → useApplyToJobPosting 뮤테이션 호출 + 완료 상태로 전환
//   3. 서버 에러(errorCode) → 매핑된 메시지로 토스트

const mockGoBack = jest.fn();
const mockApplyMutateAsync = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    TextInput: 'TextInput',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const posting = {
    postingId: 3,
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
};

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => ({params: {posting}}),
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useApplyToJobPosting: () => ({mutateAsync: mockApplyMutateAsync, isPending: false}),
}));

import JobPostingDetailScreen from '../../../src/features/recruitment/screens/JobPostingDetailScreen';
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

/** 단일 Text 노드 안에서 이어지는 인접 표현식({a}{b})을 하나의 문자열로 합쳐 반환한다. */
const joinedTextNodes = (renderer: ReactTestRenderer.ReactTestRenderer): string[] =>
    renderer.root
        .findAllByType('Text')
        .map(t => {
            const children = t.props.children;
            if (Array.isArray(children)) {
                return children.filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join('');
            }
            return children;
        })
        .filter((t): t is string => typeof t === 'string');

describe('JobPostingDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockApplyMutateAsync.mockResolvedValue({id: 1, status: 'PENDING'});
    });

    test('라우트 파라미터(posting)만으로 렌더된다 — 매장명/유형/업종/시급', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobPostingDetailScreen />);
            await flush();
        });

        const flat = joinedTextNodes(renderer!);
        expect(flat.some(t => t.includes('소담카페'))).toBe(true);
        expect(flat.some(t => t.includes('당일 대타'))).toBe(true);
        expect(flat.some(t => t.includes('카페'))).toBe(true);
        expect(flat.some(t => t.includes('10,500원'))).toBe(true);
    });

    test('"지원하기" 탭 → useApplyToJobPosting 뮤테이션 호출 + 완료 상태로 전환', async () => {
        const successSpy = jest.spyOn(AppToast, 'success').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobPostingDetailScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-posting-message-input').props.onChangeText('평일 저녁 가능해요');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-posting-apply-button').props.onPress();
            await flush();
        });

        expect(mockApplyMutateAsync).toHaveBeenCalledWith({
            postingId: 3,
            payload: {message: '평일 저녁 가능해요'},
        });
        expect(successSpy).toHaveBeenCalledWith('지원을 완료했어요.');

        const applyButton = findHostByTestId(renderer!, 'job-posting-apply-button');
        expect(applyButton.props.disabled).toBe(true);

        successSpy.mockRestore();
    });

    test('errorCode(POSTING_CLOSED) 응답 → 매핑된 메시지로 토스트', async () => {
        mockApplyMutateAsync.mockRejectedValueOnce({
            response: {status: 400, data: {errorCode: 'POSTING_CLOSED', message: '마감된 공고예요.'}},
        });
        const errorSpy = jest.spyOn(AppToast, 'error').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobPostingDetailScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'job-posting-apply-button').props.onPress();
            await flush();
        });

        expect(errorSpy).toHaveBeenCalledWith('마감된 공고예요.');
        errorSpy.mockRestore();
    });
});
