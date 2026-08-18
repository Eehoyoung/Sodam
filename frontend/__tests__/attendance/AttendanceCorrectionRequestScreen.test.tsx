import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// WP-1(docs/260817 goal) — 출퇴근 정정 사유 다듬기("AI로 사유 다듬기").
// 핵심 검증:
//   1. 사유 다듬기 버튼 → refineReason 호출 → 제안 카드 표시
//   2. "이 문구로 적용" → 사유 입력값이 제안 문구로 교체되고 제안 카드는 닫힘(자동 확정 아님, HC-5)
//   3. changed=false(다듬을 게 없음) 응답 → 제안 카드 없이 안내 토스트만

const mockGoBack = jest.fn();
const mockRefineReason = jest.fn();
const mockRequest = jest.fn();

const routeParams = {
    attendanceId: 42,
    date: '2026-08-17',
    currentCheckIn: '2026-08-17T09:00:00',
    currentCheckOut: '2026-08-17T18:00:00',
    storeName: '소담카페',
};

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => ({params: routeParams}),
}));

jest.mock('../../src/features/attendance/services/attendanceCorrectionService', () => ({
    __esModule: true,
    default: {
        request: (...args: unknown[]) => mockRequest(...args),
        refineReason: (...args: unknown[]) => mockRefineReason(...args),
    },
}));

import AttendanceCorrectionRequestScreen from '../../src/features/attendance/screens/AttendanceCorrectionRequestScreen';
import {AppToast} from '../../src/common/components/ds';

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

describe('AttendanceCorrectionRequestScreen — 정정 사유 다듬기(WP-1)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('사유를 입력하고 "AI로 사유 다듬기"를 누르면 제안 카드가 뜬다', async () => {
        mockRefineReason.mockResolvedValue({refined: '사장님께서 퇴근 처리를 늦게 눌러 실제 퇴근 시각과 달라요.', changed: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCorrectionRequestScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'correction-reason-input').props.onChangeText('사장님이 퇴근 늦게 눌러서 시간이 달라요');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'reason-refine-button').props.onPress();
            await flush();
        });

        expect(mockRefineReason).toHaveBeenCalledWith(42, '사장님이 퇴근 늦게 눌러서 시간이 달라요');

        const suggestion = renderer!.root.findAllByProps({testID: 'reason-refine-suggestion'});
        expect(suggestion.length).toBeGreaterThan(0);
    });

    test('"이 문구로 적용"을 누르면 사유 입력값이 제안 문구로 교체되고 제안 카드는 닫힌다', async () => {
        mockRefineReason.mockResolvedValue({refined: '다듬어진 사유입니다.', changed: true});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCorrectionRequestScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'correction-reason-input').props.onChangeText('원본 사유입니다요');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'reason-refine-button').props.onPress();
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'reason-refine-suggestion-apply').props.onPress();
            await flush();
        });

        expect(findHostByTestId(renderer!, 'correction-reason-input').props.value).toBe('다듬어진 사유입니다.');
        expect(renderer!.root.findAllByProps({testID: 'reason-refine-suggestion'}).length).toBe(0);
    });

    test('changed=false 응답이면 제안 카드 없이 안내 토스트만 띄운다(LLM 미활성/다듬을 것 없음 공용 경로)', async () => {
        mockRefineReason.mockResolvedValue({refined: '원본 사유입니다요', changed: false});
        const showSpy = jest.spyOn(AppToast, 'show').mockImplementation(() => {});

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<AttendanceCorrectionRequestScreen />);
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'correction-reason-input').props.onChangeText('원본 사유입니다요');
            await flush();
        });

        await act(async () => {
            findHostByTestId(renderer!, 'reason-refine-button').props.onPress();
            await flush();
        });

        expect(renderer!.root.findAllByProps({testID: 'reason-refine-suggestion'}).length).toBe(0);
        expect(showSpy).toHaveBeenCalledWith('지금 사유 그대로도 충분히 명확해요.');
        showSpy.mockRestore();
    });
});
