import React from 'react';
import {render} from '@testing-library/react-native';

jest.mock('../../src/features/salary/services/payrollService', () => ({
  __esModule: true,
  default: {getById: jest.fn(), getDetails: jest.fn()},
}));

import SalaryDetailScreen from '../../src/features/salary/screens/SalaryDetailScreen';

describe('SalaryDetailScreen calculation basis', () => {
  test('주간 초과근로와 주휴 계산 근거는 0값도 항상 표시한다', async () => {
    const {findByText, findAllByText} = render(
      <SalaryDetailScreen
        visualFixture={{
          summary: {
            payrollId: 5,
            employeeId: 10,
            storeId: 20,
            totalPay: 500_000,
            weeklyOvertimeHours: 0,
            weeklyOvertimeWage: 0,
            weeklyAllowanceHours: 0,
            weeklyAllowance: 0,
          },
          items: [],
        }}
      />,
    );

    expect(await findByText('주간 초과근로 시간')).toBeTruthy();
    expect(await findByText('주간 초과근로 가산액')).toBeTruthy();
    expect(await findByText('주휴 인정 시간')).toBeTruthy();
    expect(await findByText('주휴수당')).toBeTruthy();
    expect((await findAllByText('0h')).length).toBeGreaterThanOrEqual(2);
    expect((await findAllByText('0원')).length).toBeGreaterThanOrEqual(2);
  });
});
