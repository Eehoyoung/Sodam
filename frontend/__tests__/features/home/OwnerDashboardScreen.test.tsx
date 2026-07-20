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
let mockRouteParams: {storeId: number; managerMode: true} | undefined;
jest.mock('@react-navigation/native', () => {
    // 실제 useFocusEffect 처럼 콜백을 렌더 중이 아닌 effect 로 실행해야 무한 렌더를 막을 수 있다.
    const React = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
        useRoute: () => ({params: mockRouteParams}),
        useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
        NavigationContainer: ({children}: any) => children,
    };
});

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
jest.mock('../../../src/common/api/client', () => {
    const api = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    };
    return {__esModule: true, default: api};
});

jest.mock('../../../src/features/manager/hooks/useManagedStores', () => ({
    useManagedStores: () => ({
        data: [{
            storeId: 10,
            storeName: '소담 광교점',
            permissions: ['DASHBOARD_VIEW', 'ATTENDANCE_APPROVE', 'STAFF_VIEW'],
            active: true,
        }],
        isLoading: false,
        refetch: jest.fn(() => Promise.resolve()),
    }),
}));

// 실제 토큰 사용 — DS 컴포넌트가 named export(colors/spacing/radius/...)를 쓰므로
// 부분 모킹 대신 requireActual 로 전체 토큰을 제공한다.
jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import OwnerDashboardScreen from '../../../src/features/home/screens/OwnerDashboardScreen';
import api from '../../../src/common/api/client';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('OwnerDashboardScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = undefined;
    });

    test('매니저 모드는 owner·payroll API를 호출하지 않고 오늘 현황만 조회', async () => {
        mockRouteParams = {storeId: 10, managerMode: true};
        apiMock.get.mockResolvedValue({
            data: {
                storeId: 10,
                storeName: '소담 광교점',
                checkedInCount: 2,
                totalActiveEmployees: 4,
                pendingEmployees: ['김직원'],
            },
        } as any);

        await act(async () => {
            ReactTestRenderer.create(<OwnerDashboardScreen />);
            await flush();
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toContain('/api/store-queries/10/stats/today');
        expect(urls).not.toContain('/api/stores/master/current');
        expect(urls.some(url => String(url).includes('payroll'))).toBe(false);
        expect(urls.some(url => String(url).includes('/stats/dashboard'))).toBe(false);
    });

    test('마운트 시 stores + 대시보드 합성 엔드포인트 호출(순차 2콜 → 1콜, Phase 9)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({
                    data: [{id: 10, storeName: '소담 광교점'}],
                }) as any;
            }
            if (url.includes('/stats/dashboard')) {
                return Promise.resolve({
                    data: {
                        today: {
                            storeId: 10,
                            storeName: '소담 광교점',
                            checkedInCount: 3,
                            totalActiveEmployees: 5,
                            pendingEmployees: ['김직원'],
                        },
                        payroll: {
                            totalGross: 1000000,
                            totalNet: 900000,
                            totalWorkingHours: 100,
                            daysRemainingInMonth: 10,
                        },
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
                '/api/store-queries/10/stats/dashboard',
            ]),
        );
        expect(urls).not.toEqual(expect.arrayContaining(['/api/store-queries/10/stats/today']));
        expect(renderer).toBeTruthy();
    });

    test('매장 1개일 때 StoreSelector 가 자동 숨김 (ScrollView 1개만 — 외부 스크롤)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: [{id: 10, storeName: '소담 광교점'}]}) as any;
            }
            if (url.includes('/stats/dashboard')) {
                return Promise.resolve({
                    data: {
                        today: {
                            storeId: 10,
                            storeName: '소담 광교점',
                            checkedInCount: 0,
                            totalActiveEmployees: 0,
                            pendingEmployees: [],
                        },
                        payroll: {
                            totalGross: 0,
                            totalNet: 0,
                            totalWorkingHours: 0,
                            daysRemainingInMonth: 0,
                        },
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
            if (url.includes('/stats/dashboard')) {
                return Promise.resolve({
                    data: {
                        today: {
                            storeId: 10,
                            storeName: '소담 광교점',
                            checkedInCount: 3,
                            totalActiveEmployees: 5,
                            pendingEmployees: ['김직원', '박직원'],
                        },
                        payroll: {
                            totalGross: 0,
                            totalNet: 0,
                            totalWorkingHours: 0,
                            daysRemainingInMonth: 5,
                        },
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
            if (url.includes('/stats/dashboard')) {
                return Promise.resolve({
                    data: {
                        today: {
                            storeId: 10,
                            storeName: '소담 광교점',
                            checkedInCount: 5,
                            totalActiveEmployees: 5,
                            pendingEmployees: [],
                        },
                        payroll: {
                            totalGross: 0,
                            totalNet: 0,
                            totalWorkingHours: 0,
                            daysRemainingInMonth: 0,
                        },
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

    test('"빠르게 하기": 설정 행이 주변 구직자·채용 행으로 교체되고 나머지 3행은 그대로다 (P4 §18-9)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/master/current') {
                return Promise.resolve({data: [{id: 10, storeName: '소담 광교점'}]}) as any;
            }
            if (url.includes('/stats/dashboard')) {
                return Promise.resolve({
                    data: {
                        today: {storeId: 10, storeName: '소담 광교점', checkedInCount: 0, totalActiveEmployees: 0, pendingEmployees: []},
                        payroll: {totalGross: 0, totalNet: 0, totalWorkingHours: 0, daysRemainingInMonth: 0},
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
        // 교체된 행
        expect(texts).toContain('주변 구직자·채용');
        expect(texts).toContain('반경 4km 인증 구직자 확인');
        // 폐기된 행은 더 이상 없어야 함
        expect(texts).not.toContain('설정');
        expect(texts).not.toContain('알림·계정·매장 관리');
        // 나머지 3행 라벨은 무변경
        expect(texts).toContain('직원 추가');
        expect(texts).toContain('위치·반경 설정');
        expect(texts).toContain('노무·세무 팁');

        // AppListItem 은 testID 를 host Pressable 에 그대로 스프레드하므로 findAllByProps 는
        // (컴포지트 + host) 2개가 매치될 수 있다 — onPress 를 가진 host 노드만 골라 호출한다.
        const matches = renderer!.root.findAllByProps({testID: 'owner-quick-menu-job-seekers'});
        const host = matches.find(n => typeof n.props.onPress === 'function');
        act(() => {
            host!.props.onPress();
        });
        expect(mockNavigate).toHaveBeenCalledWith('JobSeekerList', {storeId: 10});
    });
});
