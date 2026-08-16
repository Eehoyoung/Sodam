import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (s: any) => s},
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
    RefreshControl: 'RefreshControl',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    StatusBar: 'StatusBar',
    Modal: 'Modal',
    Alert: {alert: jest.fn()},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: {storeId: number} = {storeId: 7};
jest.mock('@react-navigation/native', () => {
    const React = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
        useRoute: () => ({params: mockRouteParams}),
        useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
        NavigationContainer: ({children}: any) => children,
    };
});

jest.mock('react-native-safe-area-context', () => ({
    SafeAreaView: ({children}: any) => children,
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));

jest.mock('../../../src/common/api/client', () => {
    const api = {get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn()};
    return {__esModule: true, default: api};
});

jest.mock('../../../src/theme/tokens', () => jest.requireActual('../../../src/theme/tokens'));

import LaborRiskDashboardScreen from '../../../src/features/risk/screens/LaborRiskDashboardScreen';
import api from '../../../src/common/api/client';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('LaborRiskDashboardScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {storeId: 7};
    });

    test('노무 리스크 목록 + 상시근로자 참고 산정 카드를 함께 조회한다', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-risk') {
                return Promise.resolve({
                    data: {
                        items: [
                            {type: 'CONTRACT_UNSIGNED', severity: 'DANGER', employeeId: 1, employeeName: '김직원', message: '계약서 없음'},
                        ],
                    },
                }) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        periodStart: '2026-07-15',
                        periodEnd: '2026-08-14',
                        operatingDays: 10,
                        manDays: 49,
                        statutoryHeadcount: 4.9,
                        meetsThreshold: false,
                        roadmap: [{stage: 1, expectedYear: 2027, title: '연차유급휴가 확대 검토', description: '정부가 추진 중인 로드맵'}],
                        disclaimer: '참고용 산정이에요. 최종 판단은 근로감독관·법원의 권한입니다.',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborRiskDashboardScreen />);
            await flush();
            return r;
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toContain('/api/stores/7/labor-risk');
        expect(urls).toContain('/api/stores/7/labor-risk/statutory-headcount');

        const text = renderer.toJSON();
        expect(JSON.stringify(text)).toContain('4.9');
    });

    test('가동일 0일(operatingDays=0)이면 상시근로자 카드를 숨긴다', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-risk') {
                return Promise.resolve({data: {items: []}}) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        periodStart: '2026-07-15',
                        periodEnd: '2026-08-14',
                        operatingDays: 0,
                        manDays: 0,
                        statutoryHeadcount: 0,
                        meetsThreshold: false,
                        roadmap: [],
                        disclaimer: '참고용',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborRiskDashboardScreen />);
            await flush();
            return r;
        });

        expect(JSON.stringify(renderer.toJSON())).not.toContain('상시근로자 참고 산정');
    });

    test('상시근로자 조회 실패는 카드만 숨기고 리스크 목록은 정상 노출(best-effort)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-risk') {
                return Promise.resolve({
                    data: {items: [{type: 'MIN_WAGE_RISK', severity: 'DANGER', employeeId: 2, employeeName: '이직원', message: '최저임금 미달'}]},
                }) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount') {
                return Promise.reject(new Error('network error'));
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborRiskDashboardScreen />);
            await flush();
            return r;
        });

        expect(JSON.stringify(renderer.toJSON())).toContain('이직원');
    });
});
