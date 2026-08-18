import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// [Test Mapping] H-7 안전망 — SendContractScreen(1800줄) 구조 리팩터링 전에 핵심 경로를 고정한다.
// 근로계약서는 법적 리스크가 큰 도메인이라, 리팩터링으로 동작이 바뀌면 반드시 여기서 빨개져야 한다.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetStoreEmployees = jest.fn();
const mockGetStoreById = jest.fn();
const mockGetContext = jest.fn();
const mockCreate = jest.fn();
const mockSend = jest.fn();

jest.mock('@react-navigation/native', () => {
    const React2 = jest.requireActual('react');
    return {
        useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
        useRoute: () => ({params: {storeId: 10}}),
        useFocusEffect: (cb: () => void) => React2.useEffect(cb, []),
    };
});

jest.mock('../../src/features/contract/services/contractService', () => ({
    __esModule: true,
    default: {
        getContext: (...a: unknown[]) => mockGetContext(...a),
        create: (...a: unknown[]) => mockCreate(...a),
        send: (...a: unknown[]) => mockSend(...a),
        downloadPdfForMaster: jest.fn(),
    },
    contractErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

jest.mock('../../src/features/store/services/storeService', () => ({
    __esModule: true,
    default: {
        getStoreEmployees: (...a: unknown[]) => mockGetStoreEmployees(...a),
        getStoreById: (...a: unknown[]) => mockGetStoreById(...a),
    },
}));

import SendContractScreen from '../../src/features/contract/screens/SendContractScreen';
import {AppToast} from '../../src/common/components/ds';

const flush = async () => {
    for (let i = 0; i < 6; i++) {
        await Promise.resolve();
    }
};

const pressable = (renderer: ReactTestRenderer.ReactTestRenderer, label: string) =>
    renderer.root.findAll(
        n => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function',
    )[0];

const render = async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
        renderer = ReactTestRenderer.create(<SendContractScreen />);
        await flush();
    });
    return renderer;
};

describe('SendContractScreen 핵심 경로', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetStoreEmployees.mockResolvedValue([
            {id: 3, name: '김직원', email: 'staff@sodam.dev'},
            {id: 4, name: '박직원', email: ''},
        ]);
        mockGetStoreById.mockResolvedValue({id: 10, storeStandardHourWage: 10030});
        mockGetContext.mockResolvedValue({
            employeeCount: 3,
            fiveOrMoreEmployees: false,
            suggestedWageComponents: '기본급 시급 10,030원',
            minorWorker: false,
            minimumWage: 10030,
        });
        mockCreate.mockResolvedValue({id: 77});
        mockSend.mockResolvedValue({envelopeId: 900});
    });

    it('1단계: 매장 직원 목록을 보여주고, 선택 전에는 다음으로 못 넘어간다', async () => {
        const renderer = await render();

        expect(mockGetStoreEmployees).toHaveBeenCalledWith(10);
        expect(pressable(renderer, '김직원 선택')).toBeTruthy();
        expect(pressable(renderer, '박직원 선택')).toBeTruthy();

        const next = renderer.root.findAll(n => n.props?.accessibilityLabel === '다음')[0];
        expect(next.props.accessibilityState?.disabled).toBe(true);
    });

    it('직원을 고르면 계약 컨텍스트(최저임금·상시근로자수)를 조회한다', async () => {
        const renderer = await render();

        await act(async () => {
            pressable(renderer, '김직원 선택').props.onPress();
            await flush();
        });

        expect(mockGetContext).toHaveBeenCalledWith(10, 3);
    });

    it('직원 선택 후 다음을 누르면 2단계(계약 유형)로 이동한다', async () => {
        const renderer = await render();

        await act(async () => {
            pressable(renderer, '김직원 선택').props.onPress();
            await flush();
        });
        await act(async () => {
            renderer.root.findAll(n => n.props?.accessibilityLabel === '다음')[0].props.onPress();
            await flush();
        });

        const texts = renderer.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toEqual(expect.arrayContaining(['계약 유형을 선택해 주세요']));
    });

    it('직원 미선택 상태에서 다음 진행이 시도되면 경고만 내고 진행하지 않는다', async () => {
        const warn = jest.spyOn(AppToast, 'warn').mockImplementation(() => undefined as never);
        const renderer = await render();

        const next = renderer.root.findAll(n => n.props?.accessibilityLabel === '다음')[0];
        await act(async () => {
            next.props.onPress?.();
            await flush();
        });

        const texts = renderer.root.findAllByType('Text').map(t => t.props.children).flat();
        expect(texts).toEqual(expect.arrayContaining(['누구에게 보낼까요?']));
        warn.mockRestore();
    });
});
