import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

const mockAlert = jest.fn();

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
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
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
    NavigationContainer: ({children}: any) => children,
}));

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
        jest.clearAllMocks();
        mockAlert.mockClear();
        mockNavigate.mockClear();
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
            return Promise.resolve({data: null}) as any;
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
                '/api/attendance/employee/42/today',
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
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('출근하기');
    });

    test('WORKING 상태에서 "근무 중" 표시', async () => {
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
            return Promise.resolve({data: null}) as any;
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeAttendanceHome />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        // DS v2: WORKING 상태는 PunchButton 의 subtitle 로 표현 (title 은 카운트업 타이머)
        expect(texts).toContain('퇴근하려면 눌러주세요');
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
            return Promise.resolve({data: null}) as any;
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
            return Promise.resolve({data: null}) as any;
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
            expect(mockNavigate).toHaveBeenCalledWith('AttendanceCheckIn', {storeId: 7});
        } finally {
            global.Date = realDate;
        }
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
