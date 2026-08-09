import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockIsTossLive = jest.fn(() => false);
jest.mock('@react-navigation/native', () => {
    const ReactModule = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
        useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, []),
    };
});

jest.mock('../../../src/common/config/env', () => ({
    isTossLive: () => mockIsTossLive(),
}));

jest.mock('../../../src/common/components/ds', () => {
    const ReactModule = jest.requireActual('react');
    const {Pressable, Text, View} = jest.requireActual('react-native');
    const wrap = (name: string) => ({children, ...props}: {children?: React.ReactNode; [key: string]: unknown}) =>
        ReactModule.createElement(View, props, children ?? ReactModule.createElement(Text, null, name));
    return {
        AppBadge: ({label}: {label: string}) => ReactModule.createElement(Text, null, label),
        AppButton: ({label, onPress, testID}: {label: string; onPress?: () => void; testID?: string}) =>
            ReactModule.createElement(Pressable, {onPress, testID}, ReactModule.createElement(Text, null, label)),
        AppCard: ({children, onPress, testID}: {children: React.ReactNode; onPress?: () => void; testID?: string}) =>
            ReactModule.createElement(Pressable, {onPress, testID}, children),
        AppHeader: wrap('header'),
        AppText: ({children}: {children: React.ReactNode}) => ReactModule.createElement(Text, null, children),
        CtaStack: wrap('cta'),
        EmptyState: ({title}: {title: string}) => ReactModule.createElement(Text, null, title),
        ErrorState: ({title}: {title: string}) => ReactModule.createElement(Text, null, title),
        LoadingState: ({title}: {title?: string}) => ReactModule.createElement(Text, null, title),
        ScreenContainer: ({children, footer, header}: {children: React.ReactNode; footer?: React.ReactNode; header?: React.ReactNode}) =>
            ReactModule.createElement(View, null, header, children, footer),
    };
});

const mockPackagesRefetch = jest.fn(() => Promise.resolve());
const mockOrdersRefetch = jest.fn(() => Promise.resolve());
const mockPurchaseMutateAsync = jest.fn();
const mockCreateMutateAsync = jest.fn();
const mockReadinessRefetch = jest.fn(() => Promise.resolve());
let mockReadiness: {mode: 'MOCK' | 'LIVE' | 'UNAVAILABLE'; successUrl?: string; failUrl?: string} = {mode: 'MOCK'};

const mockPackages = [
    {name: 'INCOME_TAX_FILING', displayName: '종합소득세 신고 대행', amount: 99000},
    {name: 'INCOME_TAX_PREMIUM', displayName: '종합소득세 프리미엄', amount: 149000},
] as const;

jest.mock('../../../src/features/salary/hooks/useTaxServiceOrders', () => {
    const ReactModule = jest.requireActual('react');
    return {
        useTaxServicePackages: () => ({data: mockPackages, isLoading: false, isError: false, refetch: mockPackagesRefetch}),
        useMyTaxServiceOrders: () => ({data: [], isLoading: false, isError: false, refetch: mockOrdersRefetch}),
        useTaxPaymentReadiness: () => ({data: mockReadiness, isLoading: false, isError: false, refetch: mockReadinessRefetch}),
        useMockTaxServicePurchase: () => {
            const [isSuccess, setIsSuccess] = ReactModule.useState(false);
            return {
                isSuccess,
                isPending: false,
                mutateAsync: async (packageType: string) => {
                    const result = await mockPurchaseMutateAsync(packageType);
                    setIsSuccess(true);
                    mockOrdersRefetch();
                    return result;
                },
            };
        },
        useCreateTaxServiceOrder: () => ({isPending: false, mutateAsync: mockCreateMutateAsync}),
    };
});

import TaxServicePackagesScreen from '../../../src/features/salary/screens/TaxServicePackagesScreen';

const renderScreen = () => render(<TaxServicePackagesScreen />);

describe('TaxServicePackagesScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsTossLive.mockReturnValue(false);
        mockReadiness = {mode: 'MOCK'};
        mockPurchaseMutateAsync.mockResolvedValue({status: 'PAID'});
    });

    it('패키지를 선택해 모의 결제한 뒤 성공 상태와 주문 목록을 새로고침한다', async () => {
        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-package-INCOME_TAX_PREMIUM')).toBeTruthy());

        fireEvent.press(screen.getByTestId('tax-service-package-INCOME_TAX_PREMIUM'));
        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(mockPurchaseMutateAsync).toHaveBeenCalledWith('INCOME_TAX_PREMIUM'));
        expect(screen.getByText('신청이 완료됐어요')).toBeTruthy();
        expect(mockOrdersRefetch).toHaveBeenCalled();
    });

    it('주문 생성 실패를 화면 오류 상태로 보여준다', async () => {
        mockPurchaseMutateAsync.mockRejectedValueOnce({response: {data: {message: '주문을 만들 수 없어요.'}}});

        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-package-INCOME_TAX_FILING')).toBeTruthy());

        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(screen.getByText('주문을 만들 수 없어요.')).toBeTruthy());
        expect(mockPurchaseMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('라이브 결제에서는 mock 확인 키를 만들지 않고 결제 콜백 화면으로 이동한다', async () => {
        mockIsTossLive.mockReturnValue(true);
        mockReadiness = {
            mode: 'LIVE',
            successUrl: 'https://payments.sodam.example/tax/success',
            failUrl: 'https://payments.sodam.example/tax/fail',
        };
        mockCreateMutateAsync.mockResolvedValue({
            id: 2,
            orderId: 'TAX_LIVE_1',
            packageType: 'INCOME_TAX_FILING',
            orderName: '종합소득세 신고 대행',
            amount: 99000,
            status: 'PENDING',
            paidAt: null,
        });

        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-purchase')).toBeTruthy());
        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(mockCreateMutateAsync).toHaveBeenCalledWith('INCOME_TAX_FILING'));
        expect(mockPurchaseMutateAsync).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('TaxServicePayment', {
            orderId: 'TAX_LIVE_1', amount: 99000, orderName: '종합소득세 신고 대행',
            successUrl: 'https://payments.sodam.example/tax/success',
            failUrl: 'https://payments.sodam.example/tax/fail',
        });
    });

    it('서버 MOCK 모드와 라이브 키가 불일치하면 결제 호출이나 화면 이동을 하지 않는다', async () => {
        mockIsTossLive.mockReturnValue(true);
        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-purchase')).toBeTruthy());

        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(screen.getByText('결제 환경이 일치하지 않아요. 잠시 후 다시 시도해 주세요.')).toBeTruthy());
        expect(mockPurchaseMutateAsync).not.toHaveBeenCalled();
        expect(mockCreateMutateAsync).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('서버 LIVE 모드와 test 키가 불일치하면 주문을 만들지 않는다', async () => {
        mockReadiness = {
            mode: 'LIVE',
            successUrl: 'https://payments.sodam.example/tax/success',
            failUrl: 'https://payments.sodam.example/tax/fail',
        };
        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-purchase')).toBeTruthy());

        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(screen.getByText('결제 환경이 일치하지 않아요. 잠시 후 다시 시도해 주세요.')).toBeTruthy());
        expect(mockPurchaseMutateAsync).not.toHaveBeenCalled();
        expect(mockCreateMutateAsync).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('서버가 UNAVAILABLE이면 주문이나 결제 화면을 시작하지 않는다', async () => {
        mockReadiness = {mode: 'UNAVAILABLE'};
        const screen = renderScreen();
        await waitFor(() => expect(screen.getByTestId('tax-service-purchase')).toBeTruthy());

        fireEvent.press(screen.getByTestId('tax-service-purchase'));

        await waitFor(() => expect(screen.getByText('결제 환경이 일치하지 않아요. 잠시 후 다시 시도해 주세요.')).toBeTruthy());
        expect(mockPurchaseMutateAsync).not.toHaveBeenCalled();
        expect(mockCreateMutateAsync).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });
});
