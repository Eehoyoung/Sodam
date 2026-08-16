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

import LaborHealthDetailScreen from '../../../src/features/risk/screens/LaborHealthDetailScreen';
import api from '../../../src/common/api/client';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const plan402 = () => {
    const err: any = new Error('plan required');
    err.response = {status: 402, data: {errorCode: 'PLAN_REQUIRED'}};
    return Promise.reject(err);
};

describe('LaborHealthDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {storeId: 7};
    });

    test('PRO(FULL) — detail 엔드포인트가 성공하면 항목별 설명까지 노출하고 summary는 호출하지 않는다', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-health/detail') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        score: 85,
                        dangerCount: 1,
                        warnCount: 0,
                        needsAttentionCount: 1,
                        items: [{
                            type: 'CONTRACT_UNSIGNED',
                            severity: 'DANGER',
                            employeeId: 1,
                            employeeName: '김직원',
                            message: '근로계약서가 없어요.',
                        }],
                        disclaimer: '참고용 점수예요.',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborHealthDetailScreen />);
            await flush();
            return r;
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toContain('/api/stores/7/labor-health/detail');
        expect(urls).not.toContain('/api/stores/7/labor-health');

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('근로계약서가 없어요');
        expect(json).not.toContain('프로 플랜 보기'); // FULL 접근이면 업셀 카드 없음
    });

    test('STARTER(BASIC) — detail은 402, summary는 성공 → 건수만 노출 + 업셀 CTA', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-health/detail') {
                return plan402();
            }
            if (url === '/api/stores/7/labor-health') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        score: 85,
                        dangerCount: 1,
                        warnCount: 0,
                        needsAttentionCount: 1,
                        items: [{
                            type: 'CONTRACT_UNSIGNED',
                            severity: 'DANGER',
                            employeeId: 1,
                            employeeName: '김직원',
                            message: null,
                        }],
                        disclaimer: '참고용 점수예요.',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborHealthDetailScreen />);
            await flush();
            return r;
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).toContain('/api/stores/7/labor-health/detail');
        expect(urls).toContain('/api/stores/7/labor-health');

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('프로 플랜 보기'); // BASIC 접근이면 업셀 카드 노출
        expect(json).toContain('확인이 필요한 항목 1건');
    });

    test('FREE — detail·summary 둘 다 402 → 잠금 안내 화면(플랜 보기 CTA)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-health/detail' || url === '/api/stores/7/labor-health') {
                return plan402();
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborHealthDetailScreen />);
            await flush();
            return r;
        });

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('스타터 플랜부터 이용할 수 있어요');
        expect(json).toContain('플랜 보기');
    });

    test('detail이 402가 아닌 다른 오류면(네트워크 등) 에러 화면 + 재시도 버튼', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/labor-health/detail') {
                return Promise.reject(new Error('network error'));
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(<LaborHealthDetailScreen />);
            await flush();
            return r;
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).not.toContain('/api/stores/7/labor-health'); // 402가 아니므로 summary로 폴백하지 않음

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('불러오지 못했어요');
    });
});
