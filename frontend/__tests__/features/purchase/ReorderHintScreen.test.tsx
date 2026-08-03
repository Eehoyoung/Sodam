import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

const mockReorder = jest.fn();
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
        reorder: (...args: unknown[]) => mockReorder(...args),
    },
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
    };
});

import ReorderHintScreen from '../../../src/features/purchase/screens/ReorderHintScreen';

const mockNavigate = jest.fn();
const navigation = {navigate: mockNavigate, goBack: jest.fn()} as any;
const route = {params: {storeId: 1}} as any;

describe('ReorderHintScreen', () => {
    beforeEach(() => jest.clearAllMocks());

    test('참고용 면책 문구와 발주 힌트를 렌더한다', async () => {
        mockReorder.mockResolvedValue([
            {itemName: '양파', unit: 'kg', purchaseCount: 3, avgIntervalDays: 10, lastPurchaseDate: '2026-08-01', lastQuantity: 20},
        ]);

        const {findByText} = render(<ReorderHintScreen route={route} navigation={navigation} />);

        expect(await findByText('참고용이에요 — 재고 자동 차감은 하지 않아요.')).toBeTruthy();
        expect(await findByText('양파')).toBeTruthy();
        expect(await findByText('평균 10일')).toBeTruthy();
    });

    test('매입 기록이 없으면 빈 상태를 보여준다', async () => {
        mockReorder.mockResolvedValue([]);

        const {findByText} = render(<ReorderHintScreen route={route} navigation={navigation} />);

        expect(await findByText('아직 매입 주기가 없어요')).toBeTruthy();
    });

    // WP-05 회귀 방지: 카드 탭이 PriceTrend의 죽은 route.params.item 배선을 실제로 채운다.
    test('품목 카드를 탭하면 그 품목의 가격 추이로 이동한다', async () => {
        mockReorder.mockResolvedValue([
            {itemName: '대파', unit: '단', purchaseCount: 2, avgIntervalDays: 7, lastPurchaseDate: '2026-08-01', lastQuantity: 5},
        ]);

        const {findByText} = render(<ReorderHintScreen route={route} navigation={navigation} />);
        fireEvent.press(await findByText('대파'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('PriceTrend', {storeId: 1, item: '대파'});
        });
    });
});
