import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

const mockVendorSummary = jest.fn();
const mockMonthlySummary = jest.fn();
jest.mock('../../../src/features/purchase/services/purchaseService', () => ({
    __esModule: true,
    default: {
        scan: jest.fn(),
        create: jest.fn(),
        list: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        priceTrend: jest.fn(),
        reorder: jest.fn(),
        vendorSummary: (...args: unknown[]) => mockVendorSummary(...args),
        monthlySummary: (...args: unknown[]) => mockMonthlySummary(...args),
        itemSuggestions: jest.fn(),
        receiptImageSource: jest.fn(),
    },
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
    };
});

import PurchaseInsightScreen from '../../../src/features/purchase/screens/PurchaseInsightScreen';

const navigation = {navigate: jest.fn(), goBack: jest.fn()} as any;
const route = {params: {storeId: 1}} as any;

describe('PurchaseInsightScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockVendorSummary.mockResolvedValue([]);
        mockMonthlySummary.mockResolvedValue([]);
    });

    test('거래처별 비중과 월별 추이를 함께 렌더한다', async () => {
        mockVendorSummary.mockResolvedValue([
            {vendorName: '한빛주류', totalAmount: 30000, purchaseCount: 1, sharePercent: 60.0},
            {vendorName: 'OO청과', totalAmount: 20000, purchaseCount: 2, sharePercent: 40.0},
        ]);
        mockMonthlySummary.mockResolvedValue([
            {yearMonth: '2026-06', totalAmount: 0},
            {yearMonth: '2026-07', totalAmount: 15000},
            {yearMonth: '2026-08', totalAmount: 50000},
        ]);

        const {findByText} = render(<PurchaseInsightScreen route={route} navigation={navigation} />);

        expect(await findByText('한빛주류')).toBeTruthy();
        expect(await findByText('60.0%')).toBeTruthy();
        expect(await findByText('30,000원 · 1건')).toBeTruthy();
        expect(await findByText('08월')).toBeTruthy();
    });

    test('이번 달 매입이 없으면 거래처 비중은 빈 상태를 보여준다', async () => {
        const {findByText} = render(<PurchaseInsightScreen route={route} navigation={navigation} />);

        await waitFor(() => expect(mockVendorSummary).toHaveBeenCalled());
        expect(await findByText('이번 달 매입이 없어요')).toBeTruthy();
    });
});
