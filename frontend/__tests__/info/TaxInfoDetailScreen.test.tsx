import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

// route.params의 taxInfoId가 실제로 상세 조회 API에 전달되는지 검증한다.
// 버그: 기존 구현은 setTimeout mock 고정 데이터만 반환해 taxInfoId를 무시했다.
let mockRouteParams: {taxInfoId: number} = {taxInfoId: 7};

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

jest.mock('../../src/features/info/services/taxInfoService', () => ({
    __esModule: true,
    default: {
        getTaxInfoById: jest.fn(),
    },
}));

import taxInfoService from '../../src/features/info/services/taxInfoService';
import TaxInfoDetailScreen from '../../src/features/info/screens/TaxInfoDetailScreen';

describe('TaxInfoDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRouteParams = {taxInfoId: 7};
    });

    test('route param의 taxInfoId로 상세 조회 API를 호출하고 응답을 렌더한다', async () => {
        (taxInfoService.getTaxInfoById as jest.Mock).mockResolvedValue({
            id: '7',
            categoryId: 'TAX',
            title: '실제 세무 정보 제목',
            summary: '요약',
            content: '실제 세무 정보 본문입니다.',
            publishDate: '2026-05-10T00:00:00.000Z',
            author: '소담 세무팀',
            tags: [],
        });

        const {findByText} = render(<TaxInfoDetailScreen />);

        await waitFor(() => {
            expect(taxInfoService.getTaxInfoById).toHaveBeenCalledWith('7');
        });

        expect(await findByText('실제 세무 정보 제목')).toBeTruthy();
        expect(await findByText('실제 세무 정보 본문입니다.')).toBeTruthy();
    });

    test('다른 taxInfoId로 진입하면 그 id로 조회하고 이전 화면의 고정 mock 문구는 나타나지 않는다', async () => {
        mockRouteParams = {taxInfoId: 15};
        (taxInfoService.getTaxInfoById as jest.Mock).mockResolvedValue({
            id: '15',
            title: '다른 세무 정보',
            content: '다른 내용',
            publishDate: '2026-01-01T00:00:00.000Z',
            author: '소담 세무팀',
        });

        const {findByText, queryByText} = render(<TaxInfoDetailScreen />);

        await waitFor(() => {
            expect(taxInfoService.getTaxInfoById).toHaveBeenCalledWith('15');
        });

        expect(await findByText('다른 세무 정보')).toBeTruthy();
        expect(queryByText('2024년 세금신고 주요 변경사항 총정리')).toBeNull();
    });

    test('조회 실패 시 에러 상태를 표시한다', async () => {
        (taxInfoService.getTaxInfoById as jest.Mock).mockRejectedValue(new Error('network'));

        const {findByText} = render(<TaxInfoDetailScreen />);

        expect(await findByText('세무 정보를 찾을 수 없어요')).toBeTruthy();
    });
});
