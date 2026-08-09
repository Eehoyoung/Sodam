import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => ({
    StyleSheet: {create: (styles: unknown) => styles},
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ActivityIndicator: 'ActivityIndicator',
}));

const mockGoBack = jest.fn();
const mockConfirm = jest.fn();
const mockRoute = {
    params: {
        orderId: 'TAX_LIVE_1', amount: 99000, orderName: '종합소득세 신고 대행',
        successUrl: 'https://payments.sodam.example/tax/success',
        failUrl: 'https://payments.sodam.example/tax/fail',
    },
};

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => mockRoute,
}));
jest.mock('react-native-safe-area-context', () => ({SafeAreaView: ({children}: {children: React.ReactNode}) => children}));
jest.mock('react-native-webview', () => ({WebView: 'WebView'}));
jest.mock('../../../src/common/config/env', () => ({isTossLive: () => true, env: {tossClientKey: 'live_ck_test'}}));
jest.mock('../../../src/features/salary/hooks/useTaxServiceOrders', () => ({
    useConfirmTaxServiceOrder: () => ({isPending: false, mutateAsync: mockConfirm}),
}));
jest.mock('../../../src/common/components/ds', () => ({
    AppHeader: () => null,
    AppToast: {success: jest.fn(), error: jest.fn(), show: jest.fn()},
    ErrorState: () => null,
    LoadingState: () => null,
    ScreenContainer: ({children}: {children: React.ReactNode}) => children,
}));

import TaxServicePaymentScreen from '../../../src/features/salary/screens/TaxServicePaymentScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
};

describe('TaxServicePaymentScreen', () => {
    beforeEach(() => jest.clearAllMocks());

    it('서버가 준 정확한 HTTPS 성공 콜백과 일치하는 주문만 확인한다', async () => {
        mockConfirm.mockResolvedValue({status: 'PAID'});
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<TaxServicePaymentScreen />);
            await flush();
        });

        const webview = renderer!.root.findByType('WebView' as never);
        await act(async () => {
            webview.props.onShouldStartLoadWithRequest({
                url: 'https://payments.sodam.example/tax/success?paymentKey=PK_1&orderId=TAX_LIVE_1&amount=99000',
            });
            await flush();
        });

        expect(mockConfirm).toHaveBeenCalledWith({orderId: 'TAX_LIVE_1', paymentKey: 'PK_1', amount: 99000});
    });

    it('콜백 도메인이나 주문 값이 다르면 확인 API를 호출하지 않는다', async () => {
        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<TaxServicePaymentScreen />);
            await flush();
        });
        const webview = renderer!.root.findByType('WebView' as never);

        await act(async () => {
            webview.props.onShouldStartLoadWithRequest({
                url: 'https://evil.example/tax/success?paymentKey=PK_1&orderId=TAX_LIVE_1&amount=99000',
            });
            webview.props.onShouldStartLoadWithRequest({
                url: 'https://payments.sodam.example/tax/success?paymentKey=PK_1&orderId=OTHER&amount=99000',
            });
            await flush();
        });

        expect(mockConfirm).not.toHaveBeenCalled();
    });
});
