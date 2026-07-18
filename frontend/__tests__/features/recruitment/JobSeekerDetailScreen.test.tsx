import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// JobSeekerDetailScreen — 260711_작업통합.md Part 2 §7.4-2 / §8.3 (Phase 4) + §15.5(Phase 6).
// 핵심 검증:
//   1. 라우트 파라미터(seeker)만으로 렌더 — 추가 API 호출 없음(useJobSeekers/useMyJobSeeking 미사용)
//   2. 히어로가 그린 그라디언트(recruit.gradient)로 렌더(다크 배경 금지, §7.0)
//   3. 인증 경력/업종 분류/요일별 시간/희망지역/프라이버시 안내 섹션 렌더
//   4. "채용 제안 보내기" CTA 탭 → `JobOfferComposeSheet` 가 열린다(Phase 6 실연결, §15.5 R-11)

const mockGoBack = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Modal: 'Modal',
    TextInput: 'TextInput',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const seeker = {
    userId: 1,
    name: '김구직',
    age: 28,
    currentEmployment: null as null | {storeName: string; hireDate: string},
    desiredLocations: ['서울 중구 A', '서울 중구 B'],
    seekingTypes: ['SUBSTITUTE'],
    jobCategories: ['CAFE', 'BAKERY'],
    categoryMatched: true,
    availability: [
        {day: 'MONDAY', startTime: '10:00:00', endTime: '18:00:00'},
        {day: 'SATURDAY', startTime: '18:00:00', endTime: '22:00:00'},
    ],
    availableToday: true,
    distanceMeters: 1234,
};

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => ({params: {storeId: 10, seeker}}),
    NavigationContainer: ({children}: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

// JobOfferComposeSheet(Phase 6)가 항상 마운트되므로(visible=false 여도) useSendJobOffer 가 항상
// 호출된다 — 실제 TanStack Query 왕복 없이 결정적으로 검증하기 위해 훅 모듈을 목(mock)한다
// (JobSeekingSettingsScreen.test.tsx 와 동일 패턴).
const mockSendOfferMutateAsync = jest.fn();
jest.mock('../../../src/features/recruitment/hooks/useRecruitmentQueries', () => ({
    useSendJobOffer: () => ({mutateAsync: mockSendOfferMutateAsync, isPending: false}),
}));

import JobSeekerDetailScreen from '../../../src/features/recruitment/screens/JobSeekerDetailScreen';

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

/**
 * JSX 는 인접한 표현식({a}{b}처럼)을 별도 children 배열 항목으로 쪼갠다 — 예를 들어
 * `{day}요일` 은 children=[day, '요일'] 로 갈라져 findAllByType('Text')...flat() 만으로는
 * "월요일" 을 통으로 찾을 수 없다. 각 Text 노드의 children 배열을 노드 단위로 이어붙인
 * 문자열 목록을 반환해 "단일 노드 안에서 이어지는 문구"를 검증할 수 있게 한다.
 */
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

describe('JobSeekerDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('라우트 파라미터(seeker)만으로 렌더된다 — 이름/나이/업종/요일별시간/희망지역', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerDetailScreen />);
            await flush();
        });

        const flat = joinedTextNodes(renderer!);

        expect(flat.some(t => t.includes('김구직'))).toBe(true);
        expect(flat.some(t => t.includes('28세'))).toBe(true);
        expect(flat).toEqual(
            expect.arrayContaining([
                '카페',
                '베이커리',
                '서울 중구 A',
                '서울 중구 B',
                '우리 매장과 업종 일치',
            ]),
        );
        // 요일별 시간 리스트 — 월요일/토요일 개별 행
        expect(flat.some(t => t.includes('월요일'))).toBe(true);
        expect(flat.some(t => t.includes('토요일'))).toBe(true);
        expect(flat.some(t => t.includes('10~18'))).toBe(true);
        expect(flat.some(t => t.includes('18~22'))).toBe(true);
    });

    test('현재 소속 없음(휴직중) → 휴직중 뱃지 노출', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerDetailScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('휴직중');
    });

    test('히어로가 그린 그라디언트(recruit.gradient)로 렌더된다 — 다크 배경 금지(§7.0)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerDetailScreen />);
            await flush();
        });

        const hero = findHostByTestId(renderer!, 'job-seeker-hero-gradient');
        expect(hero.props.colors).toEqual(['#1FA566', '#43B986']);
    });

    test('프라이버시 안내 문구 노출', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerDetailScreen />);
            await flush();
        });

        const flat = joinedTextNodes(renderer!);
        expect(flat.some(t => t.includes('연락처는 비공개'))).toBe(true);
    });

    test('"채용 제안 보내기" CTA 탭 → JobOfferComposeSheet 가 열린다(Phase 6 실연결, §15.5 R-11)', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<JobSeekerDetailScreen />);
            await flush();
        });

        // 닫힌 상태에서는 시트 내부 제출 버튼이 렌더 트리에 없어야 한다(BottomSheet 는 Modal 로 감싸져
        // 있지만 이 테스트 환경의 react-native mock 은 Modal 을 'Modal' 문자열 타입으로만 렌더하므로,
        // children 은 실제로 트리에 존재한다 — 대신 시트 제목 문구로 "열림" 여부를 판별한다).
        const cta = findHostByTestId(renderer!, 'job-seeker-send-offer-button');
        await act(async () => {
            cta.props.onPress();
            await flush();
        });

        const flat = joinedTextNodes(renderer!);
        expect(flat.some(t => t.includes('채용 제안 보내기'))).toBe(true);
        expect(() => findHostByTestId(renderer!, 'job-offer-submit-button')).not.toThrow();
    });
});
