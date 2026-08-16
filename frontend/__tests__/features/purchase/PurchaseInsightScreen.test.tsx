import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

const mockVendorSummary = jest.fn();
const mockMonthlySummary = jest.fn();
const mockInsightComment = jest.fn();
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
        insightComment: (...args: unknown[]) => mockInsightComment(...args),
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
        mockInsightComment.mockResolvedValue({comment: null});
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

    test('comment가 있으면 인사이트 코멘트 카드를 표시한다(WP-5)', async () => {
        mockInsightComment.mockResolvedValue({
            comment: '이번 달은 한빛주류 비중이 가장 높았고, 최근 매입 합계는 늘어나는 추세예요.',
        });

        const {findByText} = render(<PurchaseInsightScreen route={route} navigation={navigation} />);

        expect(await findByText('이번 달은 한빛주류 비중이 가장 높았고, 최근 매입 합계는 늘어나는 추세예요.')).toBeTruthy();
    });

    test('comment=null(LLM 미활성/검증 실패)이면 코멘트 카드 없이 기존 화면만 표시된다', async () => {
        mockInsightComment.mockResolvedValue({comment: null});

        const {queryByTestId} = render(<PurchaseInsightScreen route={route} navigation={navigation} />);

        await waitFor(() => expect(mockVendorSummary).toHaveBeenCalled());
        expect(queryByTestId('purchase-insight-comment')).toBeNull();
    });

    test('insightComment 호출이 실패해도 핵심 데이터(거래처·월별) 화면은 그대로 렌더된다(HC-7 best-effort)', async () => {
        mockInsightComment.mockRejectedValue(new Error('network error'));
        mockVendorSummary.mockResolvedValue([
            {vendorName: '한빛주류', totalAmount: 30000, purchaseCount: 1, sharePercent: 60.0},
        ]);

        const {findByText, queryByTestId} = render(<PurchaseInsightScreen route={route} navigation={navigation} />);

        expect(await findByText('한빛주류')).toBeTruthy();
        expect(queryByTestId('purchase-insight-comment')).toBeNull();
    });
});
