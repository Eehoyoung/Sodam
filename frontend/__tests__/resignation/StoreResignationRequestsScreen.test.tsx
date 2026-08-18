import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// WP-5(docs/260817 퇴사 처리 기능 계획서) — 사장용 사직서 목록·상세 화면.
// 핵심 검증:
//   1. 대기 건수 배지 표시
//   2. 카드 탭 → 상세 펼침, 직원 제안에 "동의/역제안" 2액션(닫기 없음)
//   3. 동의 → agree() 호출
//   4. 합의 완료(agreedResignationDate) → "확인하기" → acknowledge() 호출
//   5. 빈 상태 렌더

const mockGoBack = jest.fn();
const mockListForStore = jest.fn();
const mockProposals = jest.fn();
const mockAgree = jest.fn();
const mockCounterPropose = jest.fn();
const mockAcknowledge = jest.fn();

const routeParams = {storeId: 7};

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => ({params: routeParams}),
    useFocusEffect: (cb: () => void) => {
        const ReactActual = jest.requireActual('react');
        ReactActual.useEffect(() => {
            cb();
        }, []);
    },
}));

jest.mock('../../src/features/resignation/services/resignationService', () => ({
    __esModule: true,
    default: {
        listForStore: (...args: unknown[]) => mockListForStore(...args),
        proposals: (...args: unknown[]) => mockProposals(...args),
        agree: (...args: unknown[]) => mockAgree(...args),
        counterPropose: (...args: unknown[]) => mockCounterPropose(...args),
        acknowledge: (...args: unknown[]) => mockAcknowledge(...args),
    },
}));

import StoreResignationRequestsScreen from '../../src/features/resignation/screens/StoreResignationRequestsScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const findHostByTestId = (renderer: ReactTestRenderer.ReactTestRenderer, testID: string) => {
    const matches = renderer.root.findAllByProps({testID});
    const host = matches.find(n => typeof n.type === 'string');
    if (!host) {
        throw new Error(`host node with testID="${testID}" not found`);
    }
    return host;
};

const pendingRequest = {
    id: 1,
    storeId: 7,
    desiredResignationDate: '2026-09-01',
    agreedResignationDate: null,
    reason: '개인 사정',
    status: 'PENDING' as const,
    requestedAt: new Date().toISOString(),
    decidedAt: null,
    signatureEnvelopeId: null,
};

describe('StoreResignationRequestsScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockProposals.mockResolvedValue([
            {proposerRole: 'EMPLOYEE', proposedDate: '2026-09-01', proposedAt: new Date().toISOString(), accepted: false},
        ]);
    });

    test('대기 건수 배지가 표시된다', async () => {
        mockListForStore.mockResolvedValue([pendingRequest]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<StoreResignationRequestsScreen />);
            await flush();
        });

        expect(renderer!.root.findAllByProps({testID: 'resignation-pending-badge'}).length).toBeGreaterThan(0);
    });

    test('카드를 탭하면 상세가 펼쳐지고 직원 제안에 "동의/역제안" 2액션이 뜬다(닫기 없음)', async () => {
        mockListForStore.mockResolvedValue([pendingRequest]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<StoreResignationRequestsScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-request-card-1').props.onPress();
            await flush();
        });

        expect(() => findHostByTestId(renderer!, 'resignation-master-agree-button')).not.toThrow();
        expect(() => findHostByTestId(renderer!, 'resignation-master-counter-propose-button')).not.toThrow();
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts.flat()).not.toContain('닫기');
    });

    test('"이 날짜에 동의"를 누르면 agree()가 호출된다', async () => {
        mockListForStore.mockResolvedValue([pendingRequest]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<StoreResignationRequestsScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-request-card-1').props.onPress();
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-master-agree-button').props.onPress();
            await flush();
        });

        expect(mockAgree).toHaveBeenCalledWith(7, 1);
    });

    test('합의된 날짜가 있으면 "확인하기" 버튼이 뜨고 누르면 acknowledge()가 호출된다', async () => {
        mockListForStore.mockResolvedValue([{...pendingRequest, agreedResignationDate: '2026-09-15'}]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<StoreResignationRequestsScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-request-card-1').props.onPress();
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-acknowledge-button').props.onPress();
            await flush();
        });

        expect(mockAcknowledge).toHaveBeenCalledWith(7, 1);
    });

    test('신청이 없으면 빈 상태를 보여준다', async () => {
        mockListForStore.mockResolvedValue([]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<StoreResignationRequestsScreen />);
            await flush();
        });

        expect(renderer!.root.findAllByProps({testID: 'resignation-empty-state'}).length).toBeGreaterThan(0);
    });
});
