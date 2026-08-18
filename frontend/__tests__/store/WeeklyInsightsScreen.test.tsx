import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

// WP-2(docs/260817 goal) — 사장 주간 브리핑. 핵심 검증:
//   1. summary가 있으면 요약 카드가 뜬다
//   2. summary가 null(LLM 미활성/실패)이면 요약 카드 없이 기존 숫자 나열형만 표시된다(fallback)

const mockGoBack = jest.fn();
const mockFetchWeeklyInsights = jest.fn();

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({goBack: mockGoBack}),
    useRoute: () => ({params: {storeId: 7}}),
}));

jest.mock('../../src/features/store/services/insightsService', () => ({
    __esModule: true,
    fetchWeeklyInsights: (...args: unknown[]) => mockFetchWeeklyInsights(...args),
}));

import WeeklyInsightsScreen from '../../src/features/store/screens/WeeklyInsightsScreen';

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

const items = [
    {eventType: 'EMPLOYEE_REGISTERED', label: '직원 등록', count: 2},
    {eventType: 'FIRST_CHECK_IN', label: '첫 출근', count: 1},
    {eventType: 'PURCHASE_SAVED', label: '매입 기록', count: 0},
];

describe('WeeklyInsightsScreen — 주간 브리핑 요약(WP-2)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('summary가 있으면 요약 카드를 표시한다', async () => {
        mockFetchWeeklyInsights.mockResolvedValue({
            storeId: 7, fromDate: '2026-08-10', days: 7, items,
            summary: '이번 주 직원 등록 2건, 첫 출근 1건이 있었어요.',
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<WeeklyInsightsScreen />);
            await flush();
        });

        const summaryNodes = renderer!.root.findAllByProps({testID: 'weekly-insights-summary'});
        expect(summaryNodes.length).toBeGreaterThan(0);

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('이번 주 직원 등록 2건, 첫 출근 1건이 있었어요.');
    });

    test('summary가 null이면(LLM 미활성/실패) 요약 카드 없이 숫자 나열형만 표시된다', async () => {
        mockFetchWeeklyInsights.mockResolvedValue({
            storeId: 7, fromDate: '2026-08-10', days: 7, items, summary: null,
        });

        let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
        await act(async () => {
            renderer = ReactTestRenderer.create(<WeeklyInsightsScreen />);
            await flush();
        });

        expect(renderer!.root.findAllByProps({testID: 'weekly-insights-summary'}).length).toBe(0);

        const texts = renderer!.root.findAllByType('Text').map(t => t.props.children);
        expect(texts).toContain('직원 등록');
        expect(texts).toContain('첫 출근');
    });
});
