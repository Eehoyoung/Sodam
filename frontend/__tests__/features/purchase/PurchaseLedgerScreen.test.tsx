import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

const mockList = jest.fn();
jest.mock('../../../src/features/purchase/services/purchaseService', () => ({
    __esModule: true,
    default: {
        list: (...args: unknown[]) => mockList(...args),
        scan: jest.fn(),
        create: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        priceTrend: jest.fn(),
        reorder: jest.fn(),
    },
}));

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual('react');
    return {
        useFocusEffect: (cb: () => void) => ReactActual.useEffect(cb, []),
    };
});

import PurchaseLedgerScreen from '../../../src/features/purchase/screens/PurchaseLedgerScreen';

const mockNavigate = jest.fn();
const navigation = {navigate: mockNavigate, goBack: jest.fn()} as any;
const route = {params: {storeId: 1}} as any;

const item = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    vendorName: 'OO청과',
    purchaseDate: '2026-08-01',
    category: 'VEGETABLE',
    categoryLabel: '야채·청과',
    totalAmount: 42000,
    status: 'CONFIRMED',
    items: [],
    ...overrides,
});

describe('PurchaseLedgerScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // 화면은 마운트 시 useEffect(월 조회)와 useFocusEffect(포커스 재조회) 양쪽에서 load()를
        // 호출한다(SalaryListScreen과 동일 컨벤션) — 정확한 호출 횟수 대신 "마지막 호출 인자"로 검증한다.
        mockList.mockResolvedValue([]);
    });

    test('매입 목록과 이번 달 합계를 렌더한다', async () => {
        mockList.mockResolvedValue([item()]);

        const {findByText, findAllByText} = render(<PurchaseLedgerScreen route={route} navigation={navigation} />);

        expect(await findByText('OO청과')).toBeTruthy();
        // 이번 달 합계(MoneyCard)와 카드 금액이 1건뿐이라 같은 금액으로 두 번 나타난다.
        expect(await findAllByText('42,000원')).toHaveLength(2);
    });

    test('매입이 없으면 빈 상태를 보여준다', async () => {
        const {findByText} = render(<PurchaseLedgerScreen route={route} navigation={navigation} />);

        expect(await findByText('이 달엔 매입 기록이 없어요')).toBeTruthy();
    });

    // WP-05 회귀 방지: 이번 달로 하드코딩돼 지난달 매입을 볼 방법이 없었다.
    test('이전 달 버튼을 누르면 지난달 범위로 다시 조회한다', async () => {
        const now = new Date();
        mockList.mockResolvedValue([item()]);

        const {findByText, findByLabelText} = render(
            <PurchaseLedgerScreen route={route} navigation={navigation} />,
        );
        await findByText('OO청과');

        const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const y = prevMonth.getFullYear();
        const m = String(prevMonth.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, prevMonth.getMonth() + 1, 0).getDate();

        fireEvent.press(await findByLabelText('이전 달'));

        await waitFor(() => {
            expect(mockList).toHaveBeenLastCalledWith(1, {
                from: `${y}-${m}-01`,
                to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
            });
        });
    });

    test('빈 달에서도 월 내비게이션이 보여 다른 달로 돌아갈 수 있다', async () => {
        const {findByLabelText} = render(<PurchaseLedgerScreen route={route} navigation={navigation} />);

        expect(await findByLabelText('이전 달')).toBeTruthy();
        expect(await findByLabelText('다음 달')).toBeTruthy();
    });

    // WP-01 회귀 방지: 분류 필터가 8개 옵션(전체+7분류) 중 4개만 노출되던 결함이 있었다.
    test('분류 필터에 8개 옵션(전체+7분류)이 전부 노출된다', async () => {
        mockList.mockResolvedValue([item()]);

        const {findByText} = render(<PurchaseLedgerScreen route={route} navigation={navigation} />);
        await findByText('OO청과');

        for (const label of ['전체', '야채·청과', '육류', '수산', '주류', '음료', '소모품', '기타']) {
            expect(await findByText(label)).toBeTruthy();
        }
    });

    test('카드를 탭하면 매입 상세(PurchaseConfirm)로 이동한다', async () => {
        mockList.mockResolvedValue([item({id: 7, vendorName: '한빛청과'})]);

        const {findByText} = render(<PurchaseLedgerScreen route={route} navigation={navigation} />);
        const card = await findByText('한빛청과');
        fireEvent.press(card);

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('PurchaseConfirm', {storeId: 1, purchaseId: 7});
        });
    });
});
