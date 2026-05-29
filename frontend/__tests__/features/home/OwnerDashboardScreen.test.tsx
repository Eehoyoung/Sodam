import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
    RefreshControl: 'RefreshControl',
    // DS v2: ScreenContainer 가 KeyboardAvoidingView/StatusBar 를 사용 → 누락 시 undefined 컴포넌트 크래시
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
    NavigationContainer: ({children}: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    // useResponsive 가 useSafeAreaInsets 사용 (compact 분기 추가 후 OwnerDashboard 가 의존)
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

// useAuth mock
jest.mock('../../../src/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {id: 1, name: '홍길동', userType: 'OWNER'},
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        kakaoLogin: jest.fn(),
    }),
    AuthProvider: ({children}: any) => children,
}));

// api mock
jest.mock('../../../src/common/utils/api', () => {
    const api = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    };
    return {__esModule: true, default: api, setOnUnauthorized: jest.fn()};
});

// 실제 토큰 사용 — DS 컴포넌트가 named export(colors/spacing/radius/...)를 쓰므로
// 부분 모킹 대신 requireActual 로 전체 토큰을 제공한다.
jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import OwnerDashboardScreen from '../../../src/features/home/screens/OwnerDashboardScreen';
import api from '../../../src/common/utils/api';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('OwnerDashboardScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('마운트 시 stores + today + month-to-date 호출', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({
                    data: [{id: 10, storeName: '소담 광교점'}],
                }) as any;
            }
            if (url.includes('/stats/today')) {
                return Promise.resolve({
                    data: {
                        storeId: 10,
                        storeName: '소담 광교점',
                        checkedInCount: 3,
                        totalActiveEmployees: 5,
                        pendingEmployees: ['김직원'],
                    },
                }) as any;
            }
            if (url.includes('/stats/payroll/month-to-date')) {
                return Promise.resolve({
                    data: {
                        totalGross: 1000000,
                        totalNet: 900000,
                        totalWorkingHours: 100,
                        daysRemainingInMonth: 10,
                    },
                }) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toEqual(
            expect.arrayContaining([
                '/api/stores/master/current',
                '/api/store-queries/10/stats/today',
                '/api/store-queries/10/stats/payroll/month-to-date',
            ]),
        );
        expect(renderer).toBeTruthy();
    });

    test('매장 1개일 때 StoreSelector 가 자동 숨김 (ScrollView 1개만 — 외부 스크롤)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: [{id: 10, storeName: '소담 광교점'}]}) as any;
            }
            if (url.includes('/stats/today')) {
                return Promise.resolve({
                    data: {
                        storeId: 10,
                        storeName: '소담 광교점',
                        checkedInCount: 0,
                        totalActiveEmployees: 0,
                        pendingEmployees: [],
                    },
                }) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });
        // StoreSelector 는 stores.length <= 1 이면 null 반환 → ScrollView 가 (StoreSelector 내부 X) 1개 (외부 ScrollView) 또는 0
        // 외부 컨테이너 자체가 ScrollView 이므로 정확히 1개여야 한다.
        const scrolls = renderer!.root.findAllByType('ScrollView');
        expect(scrolls.length).toBe(1);
    });

    test('오늘 출근 현황 카드에 checkedInCount/totalActiveEmployees 숫자 표시', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: [{id: 10, storeName: '소담 광교점'}]}) as any;
            }
            if (url.includes('/stats/today')) {
                return Promise.resolve({
                    data: {
                        storeId: 10,
                        storeName: '소담 광교점',
                        checkedInCount: 3,
                        totalActiveEmployees: 5,
                        pendingEmployees: ['김직원', '박직원'],
                    },
                }) as any;
            }
            if (url.includes('/stats/payroll/month-to-date')) {
                return Promise.resolve({
                    data: {
                        totalGross: 0,
                        totalNet: 0,
                        totalWorkingHours: 0,
                        daysRemainingInMonth: 5,
                    },
                }) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // DS v2: "출근" Metric 카드가 `${checkedInCount}/${totalActiveEmployees}` 를 단일 문자열로 렌더
        const containsCount = texts.some(c => typeof c === 'string' && c === '3/5');
        expect(containsCount).toBe(true);
    });

    test('빈 매장 응답 시 매장 정보 폴백 메시지', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: []}) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // DS v2: 매장 0개 콜드스타트(A6) → EmptyState 로 첫 매장 등록 유도
        expect(texts).toContain('첫 매장을 등록해 볼까요?');
    });

    test('빈 직원(pendingEmployees=[]) 시 "모든 직원이 출근했어요" 메시지', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: [{id: 10, storeName: '소담 광교점'}]}) as any;
            }
            if (url.includes('/stats/today')) {
                return Promise.resolve({
                    data: {
                        storeId: 10,
                        storeName: '소담 광교점',
                        checkedInCount: 5,
                        totalActiveEmployees: 5,
                        pendingEmployees: [],
                    },
                }) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('모든 직원이 출근했어요 ✅');
    });
});
