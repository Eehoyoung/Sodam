import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

// route.params의 policyId가 실제로 상세 조회 API에 전달되는지 검증한다.
// 버그: 기존 구현은 setTimeout mock 고정 데이터만 반환해 policyId를 무시했다.
let mockRouteParams: {policyId: number} = {policyId: 42};

jest.mock('@react-navigation/native', () => ({
    NavigationContainer: ({children}: any) => children,
    useNavigation: () => ({goBack: jest.fn(), navigate: jest.fn(), reset: jest.fn()}),
    createNavigationContainerRef: () => ({
        isReady: () => false,
        navigate: jest.fn(),
        reset: jest.fn(),
        goBack: jest.fn(),
        getRootState: jest.fn(),
        current: null,
    }),
    useFocusEffect: jest.fn(),
    useRoute: () => ({params: mockRouteParams}),
}));

jest.mock('../../src/features/info/services/policyService', () => ({
    __esModule: true,
    default: {
        getPolicyById: jest.fn(),
    },
}));

import policyService from '../../src/features/info/services/policyService';
import PolicyDetailScreen from '../../src/features/info/screens/PolicyDetailScreen';

describe('PolicyDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {policyId: 42};
    });

    test('route param의 policyId로 상세 조회 API를 호출하고 응답을 렌더한다', async () => {
        (policyService.getPolicyById as jest.Mock).mockResolvedValue({
            id: '42',
            categoryId: 'POLICY',
            title: '실제 정책 제목',
            summary: '요약',
            content: '실제 정책 본문 내용입니다.',
            publishDate: '2026-06-01T00:00:00.000Z',
            author: '소담 정책팀',
            tags: [],
        });

        const {findByText} = render(<PolicyDetailScreen />);

        await waitFor(() => {
            expect(policyService.getPolicyById).toHaveBeenCalledWith('42');
        });

        expect(await findByText('실제 정책 제목')).toBeTruthy();
        expect(await findByText('실제 정책 본문 내용입니다.')).toBeTruthy();
    });

    test('다른 policyId로 진입하면 그 id로 조회하고 이전 화면의 고정 mock 문구는 나타나지 않는다', async () => {
        mockRouteParams = {policyId: 99};
        (policyService.getPolicyById as jest.Mock).mockResolvedValue({
            id: '99',
            title: '다른 정책',
            content: '다른 내용',
            publishDate: '2026-01-01T00:00:00.000Z',
            author: '소담 정책팀',
        });

        const {findByText, queryByText} = render(<PolicyDetailScreen />);

        await waitFor(() => {
            expect(policyService.getPolicyById).toHaveBeenCalledWith('99');
        });

        expect(await findByText('다른 정책')).toBeTruthy();
        expect(queryByText('2024년 소상공인 디지털 전환 지원 사업 안내')).toBeNull();
    });

    test('조회 실패 시 에러 상태를 표시한다', async () => {
        (policyService.getPolicyById as jest.Mock).mockRejectedValue(new Error('network'));

        const {findByText} = render(<PolicyDetailScreen />);

        expect(await findByText('정책 정보를 찾을 수 없어요')).toBeTruthy();
    });
});
