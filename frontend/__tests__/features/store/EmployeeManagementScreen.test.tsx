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
    Share: {share: jest.fn(() => Promise.resolve())},
    Platform: {OS: 'ios', select: (o: any) => o.ios},
    useWindowDimensions: () => ({width: 375, height: 812}),
    useColorScheme: () => 'light',
}));

jest.mock('@react-navigation/native', () => {
    const React = jest.requireActual('react');
    return {
        useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
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

import EmployeeManagementScreen from '../../../src/features/store/screens/EmployeeManagementScreen';
import api from '../../../src/common/api/client';

const apiMock = api as jest.Mocked<typeof api>;

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const mockGoBack = jest.fn();
const route = {params: {storeId: 7, managerMode: false}} as any;
const navigation = {navigate: jest.fn(), goBack: mockGoBack} as any;

describe('EmployeeManagementScreen — 260816 WP-A 상시근로자 시뮬레이션 경고', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('5인 경계를 넘는 시뮬레이션 결과면 경고 카드가 뜨고, 초대 흐름은 그대로 동작한다(HC-5: 차단 아님)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/employees') {
                return Promise.resolve({data: [{id: 1, name: '김직원', phone: '010-0000-0000'}]}) as any;
            }
            if (url === '/api/stores/7') {
                return Promise.resolve({data: {id: 7, storeName: '테스트매장', businessType: '카페', storeCode: 'ABCD', fullAddress: '서울'}}) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount/simulate') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        currentStatutoryHeadcount: 4.9,
                        additionalEmployees: 1,
                        projectedStatutoryHeadcount: 5.9,
                        crossesThreshold: true,
                        newlyApplicableProvisions: ['연장·야간·휴일근로 가산수당(§56)'],
                        estimatedMonthlyCostMin: 660_000,
                        estimatedMonthlyCostMax: 2_155_680,
                        disclaimer: '참고용이에요.',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(
                <EmployeeManagementScreen route={route} navigation={navigation} />,
            );
            await flush();
            return r;
        });

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('상시근로자 5인 이상에 해당할 가능성이 있어요');

        // 경고가 떠 있어도 "직원 초대하기" 버튼은 여전히 존재하고 정상 동작한다(막지 않음).
        const inviteButton = renderer.root.findAll(
            (node: any) => node.props?.label === '직원 초대하기' || node.props?.children === '직원 초대하기',
        );
        expect(inviteButton.length).toBeGreaterThan(0);
    });

    test('경계를 넘지 않으면 경고 카드가 뜨지 않는다', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/employees') {
                return Promise.resolve({data: []}) as any;
            }
            if (url === '/api/stores/7') {
                return Promise.resolve({data: {id: 7, storeName: '테스트매장', businessType: '카페', storeCode: 'ABCD', fullAddress: '서울'}}) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount/simulate') {
                return Promise.resolve({
                    data: {
                        storeId: 7,
                        currentStatutoryHeadcount: 1.0,
                        additionalEmployees: 1,
                        projectedStatutoryHeadcount: 2.0,
                        crossesThreshold: false,
                        newlyApplicableProvisions: [],
                        estimatedMonthlyCostMin: 660_000,
                        estimatedMonthlyCostMax: 2_155_680,
                        disclaimer: '참고용이에요.',
                    },
                }) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(
                <EmployeeManagementScreen route={route} navigation={navigation} />,
            );
            await flush();
            return r;
        });

        expect(JSON.stringify(renderer.toJSON())).not.toContain('상시근로자 5인 이상에 해당할 가능성이 있어요');
    });

    test('260817 WP-5: 대기 중인 퇴사 신청이 있으면 배지가 뜨고 탭하면 관리 화면으로 이동한다', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/employees') {
                return Promise.resolve({data: [{id: 1, name: '김직원', phone: '010-0000-0000'}]}) as any;
            }
            if (url === '/api/stores/7') {
                return Promise.resolve({data: {id: 7, storeName: '테스트매장', businessType: '카페', storeCode: 'ABCD', fullAddress: '서울'}}) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount/simulate') {
                return Promise.reject(new Error('unrelated'));
            }
            if (url === '/api/stores/7/resignation-requests') {
                return Promise.resolve({data: [
                    {id: 1, status: 'PENDING', desiredResignationDate: '2026-09-01', agreedResignationDate: null, reason: null, requestedAt: new Date().toISOString(), decidedAt: null, signatureEnvelopeId: null},
                ]}) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(
                <EmployeeManagementScreen route={route} navigation={navigation} />,
            );
            await flush();
            return r;
        });

        const badge = renderer.root.findAllByProps({testID: 'resignation-pending-summary-card'});
        expect(badge.length).toBeGreaterThan(0);
        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('퇴사 신청 대기');
        expect(json).toContain('"1"');

        await act(async () => {
            badge[0].props.onPress();
            await flush();
        });
        expect(navigation.navigate).toHaveBeenCalledWith('StoreResignationRequests', {storeId: 7});
    });

    test('시뮬레이션 조회 실패는 카드만 숨기고 화면 나머지는 정상 렌더(best-effort)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/employees') {
                return Promise.resolve({data: [{id: 1, name: '김직원', phone: '010-0000-0000'}]}) as any;
            }
            if (url === '/api/stores/7') {
                return Promise.resolve({data: {id: 7, storeName: '테스트매장', businessType: '카페', storeCode: 'ABCD', fullAddress: '서울'}}) as any;
            }
            if (url === '/api/stores/7/labor-risk/statutory-headcount/simulate') {
                return Promise.reject(new Error('network error'));
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        const renderer = await act(async () => {
            const r = ReactTestRenderer.create(
                <EmployeeManagementScreen route={route} navigation={navigation} />,
            );
            await flush();
            return r;
        });

        const json = JSON.stringify(renderer.toJSON());
        expect(json).toContain('김직원');
        expect(json).not.toContain('상시근로자 5인 이상에 해당할 가능성이 있어요');
    });

    test('managerMode=true면 시뮬레이션을 조회하지 않는다(직원 조회 전용 화면)', async () => {
        apiMock.get.mockImplementation((url: string) => {
            if (url === '/api/stores/7/employees') {
                return Promise.resolve({data: []}) as any;
            }
            return Promise.reject(new Error('unexpected url ' + url));
        });

        await act(async () => {
            ReactTestRenderer.create(
                <EmployeeManagementScreen
                    route={{params: {storeId: 7, managerMode: true}} as any}
                    navigation={navigation}
                />,
            );
            await flush();
        });

        const urls = apiMock.get.mock.calls.map(c => c[0]);
        expect(urls).not.toContain('/api/stores/7/labor-risk/statutory-headcount/simulate');
    });
});
