import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// WP-5(docs/260817 퇴사 처리 기능 계획서) — 직원용 사직서 제출·상태 화면.
// 핵심 검증:
//   1. 신청 없음 → 폼 제출 시 submit()이 ISO 날짜로 호출된다
//   2. 사장 역제안 도착 → 제안 카드에 "동의/다른 날짜 제안" 2액션(닫기 없음)
//   3. "이 날짜에 동의" → agree() 호출
//   4. "다른 날짜 제안" → 날짜 입력 후 counterPropose() 호출
//   5. ACKNOWLEDGED 상태 → 확인 완료 안내

const mockGoBack = jest.fn();
const mockMyRequests = jest.fn();
const mockProposals = jest.fn();
const mockSubmit = jest.fn();
const mockWithdraw = jest.fn();
const mockAgree = jest.fn();
const mockCounterPropose = jest.fn();

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
        submit: (...args: unknown[]) => mockSubmit(...args),
        withdraw: (...args: unknown[]) => mockWithdraw(...args),
        myRequests: (...args: unknown[]) => mockMyRequests(...args),
        agree: (...args: unknown[]) => mockAgree(...args),
        counterPropose: (...args: unknown[]) => mockCounterPropose(...args),
        proposals: (...args: unknown[]) => mockProposals(...args),
    },
}));

import EmployeeResignationScreen from '../../src/features/resignation/screens/EmployeeResignationScreen';

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
    storeName: '소담카페',
    desiredResignationDate: '2026-09-01',
    agreedResignationDate: null,
    reason: '개인 사정',
    status: 'PENDING' as const,
    requestedAt: new Date().toISOString(),
    decidedAt: null,
    signatureEnvelopeId: null,
};

describe('EmployeeResignationScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('신청이 없으면 폼이 뜨고, 제출 시 submit()이 ISO 날짜로 호출된다', async () => {
        mockMyRequests.mockResolvedValue([]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeResignationScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-date-input').props.onChangeText('20260901');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-submit-button').props.onPress();
            await flush();
        });

        expect(mockSubmit).toHaveBeenCalledWith(7, '2026-09-01', undefined);
    });

    test('사장의 역제안이 마지막이면 "동의/다른 날짜 제안" 2액션 카드가 뜨고 닫기는 없다', async () => {
        mockMyRequests.mockResolvedValue([pendingRequest]);
        mockProposals.mockResolvedValue([
            {proposerRole: 'EMPLOYEE', proposedDate: '2026-09-01', proposedAt: new Date().toISOString(), accepted: false},
            {proposerRole: 'MASTER', proposedDate: '2026-09-15', proposedAt: new Date().toISOString(), accepted: false},
        ]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeResignationScreen />);
            await flush();
        });

        expect(renderer!.root.findAllByProps({testID: 'resignation-proposal-card'}).length).toBeGreaterThan(0);
        expect(() => findHostByTestId(renderer!, 'resignation-agree-button')).not.toThrow();
        expect(() => findHostByTestId(renderer!, 'resignation-counter-propose-button')).not.toThrow();
        // "닫기"에 해당하는 액션이 존재하지 않아야 한다(3차 정정 검증)
        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts.flat()).not.toContain('닫기');
    });

    test('"이 날짜에 동의"를 누르면 agree()가 호출된다', async () => {
        mockMyRequests.mockResolvedValue([pendingRequest]);
        mockProposals.mockResolvedValue([
            {proposerRole: 'EMPLOYEE', proposedDate: '2026-09-01', proposedAt: new Date().toISOString(), accepted: false},
            {proposerRole: 'MASTER', proposedDate: '2026-09-15', proposedAt: new Date().toISOString(), accepted: false},
        ]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeResignationScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-agree-button').props.onPress();
            await flush();
        });

        expect(mockAgree).toHaveBeenCalledWith(7, 1);
    });

    test('"다른 날짜 제안" → 날짜 입력 후 제안하면 counterPropose()가 ISO 날짜로 호출된다', async () => {
        mockMyRequests.mockResolvedValue([pendingRequest]);
        mockProposals.mockResolvedValue([
            {proposerRole: 'EMPLOYEE', proposedDate: '2026-09-01', proposedAt: new Date().toISOString(), accepted: false},
            {proposerRole: 'MASTER', proposedDate: '2026-09-15', proposedAt: new Date().toISOString(), accepted: false},
        ]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeResignationScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-counter-propose-button').props.onPress();
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-counter-date-input').props.onChangeText('20260920');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'resignation-counter-submit-button').props.onPress();
            await flush();
        });

        expect(mockCounterPropose).toHaveBeenCalledWith(7, 1, '2026-09-20');
    });

    test('사장이 확인(ACKNOWLEDGED)하면 확인 완료 안내가 뜬다', async () => {
        mockMyRequests.mockResolvedValue([{
            ...pendingRequest,
            status: 'ACKNOWLEDGED',
            agreedResignationDate: '2026-09-15',
        }]);

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<EmployeeResignationScreen />);
            await flush();
        });

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts.flat().some(t => typeof t === 'string' && t.includes('사장님이 확인했어요'))).toBe(true);
    });
});
