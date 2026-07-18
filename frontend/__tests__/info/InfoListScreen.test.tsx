import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react-native';
import InfoListScreen from '../../src/features/info/screens/InfoListScreen';

// jest.setup.js 의 전역 react-native mock 은 FlatList 를 호스트 태그 문자열('FlatList')로만
// 정의해 renderItem/ListEmptyComponent 를 실제로 호출하지 않는다 — 이 화면(InfoListScreen)은
// 카테고리 칩·게시글 목록 모두 FlatList 로 렌더하므로, 실제 목록 콘텐츠를 검증하려면 renderItem을
// 실행하는 최소 동작 구현으로 교체해야 한다. InfoListScreen.tsx는 `import {FlatList} from
// 'react-native'`(named import만 사용)라서 바벨이 별도 인터롭 래핑 없이 동일 싱글턴 모듈 객체를
// 참조 — 아래에서 그 객체의 FlatList 속성을 직접 교체하면 화면 쪽에서도 그대로 반영된다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RNModule = require('react-native');
RNModule.FlatList = ({data, renderItem, keyExtractor, ListEmptyComponent, contentContainerStyle, testID}: any) => {
    const items = data || [];
    if (items.length === 0) {
        if (!ListEmptyComponent) {
            return null;
        }
        return React.isValidElement(ListEmptyComponent)
            ? ListEmptyComponent
            : React.createElement(ListEmptyComponent);
    }
    return React.createElement(
        'View',
        {style: contentContainerStyle, testID},
        items.map((item: any, index: number) => {
            const key = keyExtractor ? keyExtractor(item, index) : String(index);
            return React.createElement(React.Fragment, {key}, renderItem({item, index}));
        }),
    );
};

// 서비스 레이어만 mock — 화면 로직(탭 전환 → 실제 재조회)을 실렌더링으로 검증한다.
jest.mock('../../src/features/info/services/laborInfoService', () => ({
    __esModule: true,
    default: {
        getCategories: jest.fn(),
        getLaborInfosByCategory: jest.fn(),
    },
}));
jest.mock('../../src/features/info/services/taxInfoService', () => ({
    __esModule: true,
    default: {
        getCategories: jest.fn(),
        getTaxInfosByCategory: jest.fn(),
    },
}));
jest.mock('../../src/features/info/services/policyService', () => ({
    __esModule: true,
    default: {
        getCategories: jest.fn(),
        getPoliciesByCategory: jest.fn(),
    },
}));
jest.mock('../../src/features/info/services/tipsService', () => ({
    __esModule: true,
    default: {
        getCategories: jest.fn(),
        getTipsByCategory: jest.fn(),
    },
}));

import laborInfoService from '../../src/features/info/services/laborInfoService';
import taxInfoService from '../../src/features/info/services/taxInfoService';
import policyService from '../../src/features/info/services/policyService';
import tipsService from '../../src/features/info/services/tipsService';

const ALL_CATEGORY = [{id: 'ALL', name: '전체', description: '전체 보기'}];

const laborArticle = {
    id: '1',
    categoryId: 'LABOR',
    title: '노동법 게시글',
    summary: '노동법 요약',
    content: '',
    publishDate: '2026-07-01T00:00:00.000Z',
    tags: [],
};

const taxArticle = {
    id: '2',
    categoryId: 'TAX',
    title: '세금 게시글',
    summary: '세금 요약',
    content: '',
    publishDate: '2026-07-02T00:00:00.000Z',
    tags: [],
};

describe('InfoListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (laborInfoService.getCategories as jest.Mock).mockResolvedValue(ALL_CATEGORY);
        (taxInfoService.getCategories as jest.Mock).mockResolvedValue(ALL_CATEGORY);
        (policyService.getCategories as jest.Mock).mockResolvedValue(ALL_CATEGORY);
        (tipsService.getCategories as jest.Mock).mockResolvedValue(ALL_CATEGORY);

        (laborInfoService.getLaborInfosByCategory as jest.Mock).mockResolvedValue([laborArticle]);
        (taxInfoService.getTaxInfosByCategory as jest.Mock).mockResolvedValue([taxArticle]);
        (policyService.getPoliciesByCategory as jest.Mock).mockResolvedValue([]);
        (tipsService.getTipsByCategory as jest.Mock).mockResolvedValue([]);
    });

    test('초기 마운트 — 노동법 탭의 목록을 조회하고 렌더한다', async () => {
        const {findByText} = render(<InfoListScreen />);

        expect(await findByText('노동법 게시글')).toBeTruthy();
        expect(laborInfoService.getLaborInfosByCategory).toHaveBeenCalledWith('ALL');
        expect(taxInfoService.getTaxInfosByCategory).not.toHaveBeenCalled();
    });

    test('탭을 "세금"으로 전환하면 세금 서비스로 재조회되고, 이전 탭(노동법) 목록은 사라진다', async () => {
        const {findByText, getByText, queryByText} = render(<InfoListScreen />);

        // 초기: 노동법 탭 목록 로드 대기
        expect(await findByText('노동법 게시글')).toBeTruthy();

        fireEvent.press(getByText('세금'));

        // 회귀 지점: 카테고리 값('ALL')이 탭 전환 전후로 동일해도 세금 서비스가 호출되고
        // 화면이 세금 탭의 실제 목록으로 교체되어야 한다.
        await waitFor(() => {
            expect(taxInfoService.getTaxInfosByCategory).toHaveBeenCalledWith('ALL');
        });

        expect(await findByText('세금 게시글')).toBeTruthy();
        expect(queryByText('노동법 게시글')).toBeNull();
    });

    test('탭을 "정책"으로 전환하면 정책 서비스가 호출되고 빈 상태가 노출된다', async () => {
        const {findByText, getByText} = render(<InfoListScreen />);

        expect(await findByText('노동법 게시글')).toBeTruthy();

        fireEvent.press(getByText('정책'));

        await waitFor(() => {
            expect(policyService.getPoliciesByCategory).toHaveBeenCalledWith('ALL');
        });

        expect(await findByText('정보가 없어요')).toBeTruthy();
    });
});
