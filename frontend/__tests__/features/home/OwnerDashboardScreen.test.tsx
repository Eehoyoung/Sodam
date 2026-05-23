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
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
    NavigationContainer: ({children}: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
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

jest.mock('../../../src/theme/tokens', () => ({
    tokens: {
        colors: {
            brandPrimary: '#FF6B35',
            brandSecondary: '#222',
            brandPrimaryDark: '#C2410C',
            textPrimary: '#111',
            textSecondary: '#374151',
            textTertiary: '#9CA3AF',
            textInverse: '#fff',
            success: '#16A34A',
            successBg: '#DCFCE7',
            warning: '#CA8A04',
            warningBg: '#FEF9C3',
            error: '#DC2626',
            errorBg: '#FEE2E2',
            info: '#2563EB',
            infoBg: '#DBEAFE',
            background: '#FFF',
            surface: '#FFF',
            surfaceMuted: '#F3F4F6',
            divider: '#E5E7EB',
            border: '#E5E7EB',
        },
        spacing: {xs: 2, sm: 4, md: 8, lg: 12, xl: 16, xxl: 20, xxxl: 24, huge: 40},
        radius: {md: 6, lg: 10, xl: 14, pill: 999},
        typography: {
            sizes: {xs: 11, sm: 13, md: 15, lg: 17, xl: 19, xxl: 22, display: 28},
            weights: {semibold: '600', bold: '700'},
        },
        shadow: {sm: {}, md: {}, lg: {}, brand: {}},
        gradient: {brand: ['#FF6B35', '#FF8A65']},
    },
}));

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
        // Badge 의 text 가 "3/5명" 으로 들어감 (Badge 내부 Text)
        const containsCount = texts.some(c => {
            if (typeof c === 'string') return c === '3/5명';
            return false;
        });
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
        // today 가 null 일 때 greetingStore 는 "매장 정보 불러오는 중…" 표시
        expect(texts).toContain('매장 정보 불러오는 중…');
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
