import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

const mockAlert = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
    // DS v2: ScreenContainer→KeyboardAvoidingView/StatusBar, PunchButton→useWindowDimensions(useResponsive)
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Alert: {alert: mockAlert},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
    // 실제 useFocusEffect 처럼 콜백을 렌더 중이 아닌 effect 로 실행해야 무한 렌더를 막을 수 있다.
    const React = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
        useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    // PunchButton 의 useResponsive 가 useSafeAreaInsets 사용
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../../../src/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: {id: 42, name: '김알바', userType: 'EMPLOYEE'},
        isAuthenticated: true,
        loading: false,
        login: jest.fn(),
        logout: jest.fn(),
        kakaoLogin: jest.fn(),
    }),
    AuthProvider: ({children}: any) => children,
}));

jest.mock('../../../src/common/utils/api', () => {
    const api = {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    };
    return {__esModule: true, default: api, setOnUnauthorized: jest.fn()};
});

jest.mock('../../../src/features/manager/hooks/useManagedStores', () => ({
    useManagedStores: () => ({
        data: [],
        refetch: jest.fn(() => Promise.resolve()),
    }),
}));

// 실제 토큰 사용 — DS named export 전체 제공 (부분 모킹 시 import 크래시)
jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import EmployeeAttendanceHome from '../../../src/features/attendance/screens/EmployeeAttendanceHome';
import api from '../../../src/common/utils/api';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('EmployeeAttendanceHome', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        mockAlert.mockClear();
        mockNavigate.mockClear();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('마운트 시 매장 + 오늘 출퇴근 조회 API 호출', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 1, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({data: null}) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toEqual(
            expect.arrayContaining([
                '/api/stores/employee/42',
                '/api/attendance/employee/42/store/1/today',
            ]),
        );
        expect(renderer).toBeTruthy();
    });

    test('IDLE 상태에서 "출근하기" 텍스트 표시', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 1, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({data: null}) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('출근하기');
    });

    test('WORKING 상태에서 "지금 근무 중이에요" 표시', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 1, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({
                    data: {
                        id: 100,
                        storeId: 1,
                        storeName: '소담카페',
                        checkInTime: new Date().toISOString(),
                        workingMinutes: 60,
                        appliedHourlyWage: 10000,
                    },
                }) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('지금 근무 중이에요');
    });

    test('DONE 상태에서 "오늘 근무 완료" 표시', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 1, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({
                    data: {
                        id: 100,
                        storeId: 1,
                        storeName: '소담카페',
                        checkInTime: '2026-05-23T09:00:00.000Z',
                        checkOutTime: '2026-05-23T18:00:00.000Z',
                        workingMinutes: 480,
                        appliedHourlyWage: 10000,
                    },
                }) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('오늘 근무 완료');
    });

    test('IDLE 큰 동그라미 press 시 AttendanceCheckIn 으로 navigate', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 7, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({data: null}) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        // 운영 시간 내 (handleAction 의 isLikelyOutside 회피)
        const realDate = Date;
        // UTC 12시 — 어떤 타임존이라도 시각이 5~22 사이 안에 들어가도록 보수적 선택
        const fixedNow = new Date('2026-05-23T12:00:00.000Z');
        // @ts-ignore
        global.Date = class extends realDate {
            constructor(...args: any[]) {
                if (args.length === 0) {
                    super(fixedNow.getTime());
                    return;
                }
                // @ts-ignore
                super(...args);
            }
            static now() {
                return fixedNow.getTime();
            }
        };
        // getHours 가 10 이라 안전 (5~23 사이)
        try {
            let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
            await act(async () => {
                renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
                await flush();
            });

            // DS v2: PunchButton(원형 CTA)은 accessibilityLabel 이 "출근하기, ..." 로 시작
            const pressables = renderer!.root.findAllByType('Pressable');
            const circle = pressables.find(p =>
                typeof p.props.accessibilityLabel === 'string' &&
                p.props.accessibilityLabel.startsWith('출근하기'),
            )!;
            expect(circle).toBeTruthy();
            await act(async () => {
                circle.props.onPress();
                await flush();
            });
            // 출퇴근은 실제 처리 화면 'Attendance'(AttendanceScreen)로 연결 (구 AttendanceCheckIn 라우트 미구현)
            expect(mockNavigate).toHaveBeenCalledWith('Attendance');
        } finally {
            global.Date = realDate;
        }
    });

    test('퀵메뉴 교체 회귀: 배열 길이 불변 + 채용·구직/우리 매장 대타 2개만 교체', async () => {
        // 260711_작업통합.md Part 2 §18-8·§18-10 — '내 요청'(request)→'채용·구직', '대타 지원'→
        // '우리 매장 대타' 2개 타일만 키 기반으로 교체하고 나머지 12개는 라벨/아이콘/개수가
        // 그대로여야 한다(퀵메뉴 배열은 실제 14타일 구조 — 계획서상 "12타일"과 혼동 금지).
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({
                    data: [{id: 1, storeName: '소담카페', storeStandardHourWage: 10000}],
                }) as any;
            }
            if (url.endsWith('/today')) {
                return Promise.resolve({data: null}) as any;
            }
            return Promise.resolve({data: []}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        // 퀵메뉴 타일만 activeOpacity=0.75 로 고정돼 있어 다른 TouchableOpacity(알림/설정/알림스트립/
        // 정책 리스트 등)와 구분 가능하다.
        const quickTiles = renderer!.root
            .findAllByType('TouchableOpacity')
            .filter(n => n.props.activeOpacity === 0.75);

        expect(quickTiles).toHaveLength(14);

        const labels = quickTiles.map(tile => {
            const texts = tile.findAllByType('Text').map(t => t.props.children);
            return texts[texts.length - 1];
        });

        expect(labels).toEqual([
            '내 스케줄',
            '급여명세',
            '계약서',
            '내 연차',
            '휴가 신청',
            '채용·구직',
            '지각/조퇴/결근 알리기',
            '시급 이력',
            '공지사항',
            '매장 합류',
            '노무 정보',
            '증명서 발급',
            '근무일지',
            '우리 매장 대타',
        ]);

        expect(labels).not.toContain('내 요청');
        expect(labels).not.toContain('대타 지원');
    });

    test.skip('selectedStore 가 없을 때 handleAction → 알림 노출', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url.startsWith('/api/stores/employee/')) {
                return Promise.resolve({data: []}) as any;
            }
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        // 매장 없음 → 안내 텍스트
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('소속 매장이 아직 없어요.');

        // 동그라미 누르면 알림
        const pressables = renderer!.root.findAllByType('Pressable');
        await act(async () => {
            pressables[0].props.onPress();
            await flush();
        });
        expect(mockAlert).toHaveBeenCalledWith('알림', '먼저 매장을 선택해 주세요.');
    });
});
