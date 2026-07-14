import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

// route.params의 tipId가 실제로 상세 조회 API에 전달되는지 검증한다.
// 버그: 기존 구현은 setTimeout mock 고정 데이터만 반환해 tipId를 무시했다.
//
// API 매핑: /api/tip-info/{id} (TipInfoController) — TipInfoResponseDto는 title/content/imagePath/
// createdAt/updatedAt 형태로 policy-info·tax-info와 동일 shape이며, 이미 존재하는
// tipsService.getTipById가 이 경로를 호출한다. QnaInfoController(/api/qna-info)는 question/answer
// 필드를 갖는 "사이트 질문(1:1 문의)" 도메인이라 이 화면(운영 팁)과는 shape가 맞지 않아 제외했다.
let mockRouteParams: {tipId: number} = {tipId: 3};

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

jest.mock('../../src/features/info/services/tipsService', () => ({
    __esModule: true,
    default: {
        getTipById: jest.fn(),
    },
}));

import tipsService from '../../src/features/info/services/tipsService';
import TipsDetailScreen from '../../src/features/info/screens/TipsDetailScreen';

describe('TipsDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {tipId: 3};
    });

    test('route param의 tipId로 상세 조회 API를 호출하고 응답을 렌더한다', async () => {
        (tipsService.getTipById as jest.Mock).mockResolvedValue({
            id: '3',
            categoryId: 'TIPS',
            title: '실제 운영 팁 제목',
            summary: '실제 운영 팁 요약',
            content: '실제 운영 팁 본문입니다.',
            publishDate: '2026-04-01T00:00:00.000Z',
            author: '소담 창업팀',
            tags: [],
        });

        const {findByText} = render(<TipsDetailScreen />);

        await waitFor(() => {
            expect(tipsService.getTipById).toHaveBeenCalledWith('3');
        });

        expect(await findByText('실제 운영 팁 제목')).toBeTruthy();
        expect(await findByText('실제 운영 팁 본문입니다.')).toBeTruthy();
    });

    test('다른 tipId로 진입하면 그 id로 조회하고 이전 화면의 고정 mock 문구는 나타나지 않는다', async () => {
        mockRouteParams = {tipId: 21};
        (tipsService.getTipById as jest.Mock).mockResolvedValue({
            id: '21',
            title: '다른 운영 팁',
            summary: '다른 요약',
            content: '다른 내용',
            publishDate: '2026-01-01T00:00:00.000Z',
            author: '소담 창업팀',
        });

        const {findByText, queryByText} = render(<TipsDetailScreen />);

        await waitFor(() => {
            expect(tipsService.getTipById).toHaveBeenCalledWith('21');
        });

        expect(await findByText('다른 운영 팁')).toBeTruthy();
        expect(queryByText('점포 위치 선정 시 체크해야 할 10가지 포인트')).toBeNull();
    });

    test('조회 실패 시 에러 상태를 표시한다', async () => {
        (tipsService.getTipById as jest.Mock).mockRejectedValue(new Error('network'));

        const {findByText} = render(<TipsDetailScreen />);

        expect(await findByText('정보를 찾을 수 없어요')).toBeTruthy();
    });
});
