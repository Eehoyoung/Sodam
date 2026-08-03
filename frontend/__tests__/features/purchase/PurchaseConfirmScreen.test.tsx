import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';

const mockCreate = jest.fn();
const mockReceiptImageSource = jest.fn();
const mockItemSuggestions = jest.fn();
jest.mock('../../../src/features/purchase/services/purchaseService', () => ({
    __esModule: true,
    default: {
        scan: jest.fn(),
        create: (...args: unknown[]) => mockCreate(...args),
        list: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        priceTrend: jest.fn(),
        reorder: jest.fn(),
        vendorSummary: jest.fn(),
        monthlySummary: jest.fn(),
        itemSuggestions: (...args: unknown[]) => mockItemSuggestions(...args),
        receiptImageSource: (...args: unknown[]) => mockReceiptImageSource(...args),
    },
}));

import {AppToast} from '../../../src/common/components/ds';
import PurchaseConfirmScreen from '../../../src/features/purchase/screens/PurchaseConfirmScreen';

const navigation = {navigate: jest.fn(), goBack: jest.fn()} as any;
const route = {params: {storeId: 1}} as any;

describe('PurchaseConfirmScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockReceiptImageSource.mockResolvedValue({uri: 'http://x/receipt-image?ref=r', headers: {}});
        mockItemSuggestions.mockResolvedValue([]);
    });

    test('거래처를 입력하지 않으면 저장을 막고 경고한다', async () => {
        const warnSpy = jest.spyOn(AppToast, 'warn').mockImplementation(() => {});

        const {findByText} = render(<PurchaseConfirmScreen route={route} navigation={navigation} />);
        fireEvent.press(await findByText('매입 저장'));

        await waitFor(() => expect(warnSpy).toHaveBeenCalledWith('거래처를 입력해 주세요.'));
        expect(mockCreate).not.toHaveBeenCalled();

        warnSpy.mockRestore();
    });

    test('품목명 입력 시 자동완성 제안이 뜨고, 탭하면 채워진다', async () => {
        mockItemSuggestions.mockResolvedValue(['양파', '양배추']);

        const {getByPlaceholderText, findByText} = render(
            <PurchaseConfirmScreen route={route} navigation={navigation} />,
        );

        const itemInput = getByPlaceholderText('품목명 (예: 양파)');
        fireEvent(itemInput, 'focus');
        fireEvent.changeText(itemInput, '양');

        await waitFor(() => expect(mockItemSuggestions).toHaveBeenCalledWith(1, '양'), {timeout: 2000});
        fireEvent.press(await findByText('양배추'));

        expect(itemInput.props.value).toBe('양배추');
    });

    test('수량×단가로 품목 합계·전체 합계가 자동 계산된다', async () => {
        const {getByPlaceholderText, findByText} = render(
            <PurchaseConfirmScreen route={route} navigation={navigation} />,
        );

        fireEvent.changeText(getByPlaceholderText('품목명 (예: 양파)'), '양파');
        fireEvent.changeText(getByPlaceholderText('수량'), '10');
        fireEvent.changeText(getByPlaceholderText('단가'), '2000');

        expect(await findByText('합계 20,000원')).toBeTruthy();
        expect(await findByText('20,000원')).toBeTruthy();
    });

    test('필수 항목을 채우고 저장하면 create가 호출되고 성공 화면을 보여준다', async () => {
        mockCreate.mockResolvedValueOnce({id: 1});

        const {getByPlaceholderText, findByText} = render(
            <PurchaseConfirmScreen route={route} navigation={navigation} />,
        );

        fireEvent.changeText(getByPlaceholderText('예: OO청과'), 'OO청과');
        fireEvent.changeText(getByPlaceholderText('품목명 (예: 양파)'), '양파');
        fireEvent.changeText(getByPlaceholderText('수량'), '10');
        fireEvent.changeText(getByPlaceholderText('단가'), '2000');

        fireEvent.press(await findByText('매입 저장'));

        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        expect(mockCreate.mock.calls[0][0]).toBe(1);
        expect(mockCreate.mock.calls[0][1]).toMatchObject({
            vendorName: 'OO청과',
            category: 'VEGETABLE',
            items: [{itemName: '양파', quantity: 10, unitPrice: 2000}],
        });
        expect(await findByText('매입을 저장했어요')).toBeTruthy();
    });

    test('스캔된 영수증 원본이 있으면 썸네일을 보여주고, 제거하면 저장 요청에서 빠진다', async () => {
        mockCreate.mockResolvedValueOnce({id: 1});
        const draftRoute = {
            params: {
                storeId: 1,
                draft: {
                    vendorName: 'OO청과',
                    purchaseDate: '2026-08-01',
                    category: 'VEGETABLE',
                    items: [{itemName: '양파', quantity: 10, unitPrice: 2000}],
                    ocrAvailable: true,
                    imageRef: 'stores/1/receipts/abc.jpg',
                },
            },
        } as any;

        const {findByText, findByLabelText} = render(
            <PurchaseConfirmScreen route={draftRoute} navigation={navigation} />,
        );

        await waitFor(() => expect(mockReceiptImageSource).toHaveBeenCalledWith(1, 'stores/1/receipts/abc.jpg'));
        expect(await findByLabelText('첨부된 영수증 원본')).toBeTruthy();

        fireEvent.press(await findByLabelText('영수증 원본 제거'));

        fireEvent.press(await findByText('매입 저장'));
        await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
        expect(mockCreate.mock.calls[0][1].imageRef).toBeUndefined();
    });

    test('OCR 인식 합계와 품목 합계가 다르면 대조 안내를 보여준다', async () => {
        const draftRoute = {
            params: {
                storeId: 1,
                draft: {
                    vendorName: 'OO청과',
                    purchaseDate: '2026-08-01',
                    category: 'VEGETABLE',
                    items: [{itemName: '양파', quantity: 10, unitPrice: 2000}], // 20,000원
                    ocrAvailable: true,
                    recognizedTotal: 25000, // 영수증 인식 합계는 다름
                },
            },
        } as any;

        const {findByText} = render(<PurchaseConfirmScreen route={draftRoute} navigation={navigation} />);

        expect(await findByText('영수증 인식 합계(25,000원)와 달라요. 품목을 확인해 주세요.')).toBeTruthy();
    });
});
