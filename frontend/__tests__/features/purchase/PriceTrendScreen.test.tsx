import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

const mockPriceTrend = jest.fn();
jest.mock('../../../src/features/purchase/services/purchaseService', () => ({
    __esModule: true,
    default: {
        scan: jest.fn(),
        create: jest.fn(),
        list: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        priceTrend: (...args: unknown[]) => mockPriceTrend(...args),
        reorder: jest.fn(),
    },
}));

import PriceTrendScreen from '../../../src/features/purchase/screens/PriceTrendScreen';

const navigation = {navigate: jest.fn(), goBack: jest.fn()} as any;
const route = {params: {storeId: 1}} as any;

describe('PriceTrendScreen', () => {
    beforeEach(() => jest.clearAllMocks());

    test('검색하면 현재 단가·변동률·최저가 거래처를 보여준다', async () => {
        mockPriceTrend.mockResolvedValueOnce({
            itemName: '양파',
            unit: 'kg',
            currentUnitPrice: 2100,
            previousUnitPrice: 2300,
            changeRatePercent: -8.7,
            cheapestVendor: 'OO청과',
            cheapestUnitPrice: 1800,
            points: [
                {date: '2026-05-01', vendorName: 'OO청과', unitPrice: 1800, quantity: 10, unit: 'kg'},
                {date: '2026-06-16', vendorName: 'OO청과', unitPrice: 2100, quantity: 10, unit: 'kg'},
            ],
        });

        const {getByPlaceholderText, findByText} = render(
            <PriceTrendScreen route={route} navigation={navigation} />,
        );

        fireEvent.changeText(getByPlaceholderText('예: 양파'), '양파');
        fireEvent.press(await findByText('가격 추이 보기'));

        await waitFor(() => expect(mockPriceTrend).toHaveBeenCalledWith(1, '양파'));
        expect(await findByText('2,100원/kg')).toBeTruthy();
        expect(await findByText('최저')).toBeTruthy();
    });

    test('비교할 단가가 없으면 빈 상태를 보여준다', async () => {
        mockPriceTrend.mockResolvedValueOnce({
            itemName: '없음',
            unit: undefined,
            currentUnitPrice: undefined,
            points: [],
        });

        const {getByPlaceholderText, findByText} = render(
            <PriceTrendScreen route={route} navigation={navigation} />,
        );

        fireEvent.changeText(getByPlaceholderText('예: 양파'), '없음');
        fireEvent.press(await findByText('가격 추이 보기'));

        expect(await findByText('비교할 단가가 없어요')).toBeTruthy();
    });

    // WP-05 회귀 방지: route.params.item이 있어도 입력창만 채우고 검색은 실행하지 않던 죽은 배선이었다.
    test('item 파라미터로 진입하면 입력만 채우지 않고 바로 검색까지 실행한다', async () => {
        mockPriceTrend.mockResolvedValueOnce({
            itemName: '대파',
            unit: '단',
            currentUnitPrice: 3000,
            points: [{date: '2026-08-01', vendorName: 'OO청과', unitPrice: 3000, quantity: 5, unit: '단'}],
        });

        const {findByText} = render(
            <PriceTrendScreen route={{params: {storeId: 1, item: '대파'}} as any} navigation={navigation} />,
        );

        await waitFor(() => expect(mockPriceTrend).toHaveBeenCalledWith(1, '대파'));
        expect(await findByText('3,000원/단')).toBeTruthy();
    });
});
