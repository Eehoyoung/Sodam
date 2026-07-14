import React from 'react';
import {render, waitFor, fireEvent} from '@testing-library/react-native';

// jest.setup.js 의 전역 react-native mock 은 FlatList 를 호스트 태그 문자열('FlatList')로만
// 정의해 renderItem/ListEmptyComponent 를 실제로 호출하지 않는다. SalaryListScreen 목록 콘텐츠를
// 검증하려면 InfoListScreen.test.tsx 와 동일한 패턴으로 최소 동작 구현으로 교체해야 한다.
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

// [FE_BE_SCHEMA_GAP §1-2] 회귀 테스트.
//
// 버그: GET /api/payroll/store/{storeId} 는 BE PayrollDto[] (id/netWage/평평한 startDate·endDate)
// 를 반환하는데, 화면은 이를 이미 정규화된 PayrollSummary(payrollId/totalPay/nested period)로
// 취급했다. 그 결과 금액·기간이 안 보이고 payrollId 는 항상 undefined/0 이 되어 상세화면 진입이
// 막혔다.
//
// 여기서는 payrollService 를 목하지 않고 common/utils/api(axios 래퍼)만 목해 BE 원본 응답 형태를
// 그대로 흘려보낸다 — service 의 정규화 + 화면의 렌더링을 함께(엔드투엔드로) 검증하기 위함이다.

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: mockNavigate, goBack: jest.fn()}),
  useFocusEffect: jest.fn(),
  useRoute: () => ({params: {}}),
  NavigationContainer: ({children}: any) => children,
}));

// 실시간 동기화(STOMP)는 이 화면의 스키마 버그와 무관 — 외부 연결 없이 no-op 처리.
jest.mock('../../src/common/hooks/useStoreLiveSync', () => ({
  __esModule: true,
  useStoreLiveSync: jest.fn(),
  default: jest.fn(),
}));

jest.mock('../../src/common/utils/api', () => {
  const get = jest.fn();
  return {
    __esModule: true,
    default: {get, post: jest.fn(), put: jest.fn(), delete: jest.fn()},
    api: {get, post: jest.fn(), put: jest.fn(), delete: jest.fn()},
  };
});

import api from '../../src/common/utils/api';
import SalaryListScreen from '../../src/features/salary/screens/SalaryListScreen';

const getMock = api.get as jest.Mock;

describe('SalaryListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('BE PayrollDto[](id/netWage/평평한 날짜)를 정상적으로 금액·기간으로 표시한다', async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          id: 101,
          employeeId: 7,
          employeeName: '홍길동',
          storeId: 1,
          startDate: '2026-05-01',
          endDate: '2026-05-31',
          totalHours: 160,
          netWage: 1_800_000,
          status: 'PAID',
        },
      ],
    });

    const {findByText} = render(<SalaryListScreen />);

    expect(await findByText('홍길동')).toBeTruthy();
    expect(await findByText('1,800,000원')).toBeTruthy();
    expect(await findByText('2026-05-01 ~ 2026-05-31')).toBeTruthy();
    expect(await findByText('총 근무 160h')).toBeTruthy();
  });

  test('카드를 탭하면 BE id 값 그대로(payrollId undefined/0 아님) SalaryDetail 로 이동한다', async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {id: 202, employeeId: 8, employeeName: '김직원', storeId: 1, startDate: '2026-06-01', endDate: '2026-06-30', netWage: 2_100_000, status: 'CONFIRMED'},
      ],
    });

    const {findByText} = render(<SalaryListScreen />);

    const card = await findByText('김직원');
    fireEvent.press(card);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({name: 'SalaryDetail', params: {payrollId: 202}});
    });
  });

  test('목록이 비어 있으면 빈 상태를 보여준다', async () => {
    getMock.mockResolvedValueOnce({data: []});

    const {findByText} = render(<SalaryListScreen />);

    expect(await findByText('아직 급여 내역이 없어요')).toBeTruthy();
  });
});
