import React from 'react';
import {render, waitFor} from '@testing-library/react-native';

// [FE_BE_SCHEMA_GAP §1-1] 회귀 테스트.
//
// 버그: GET /api/payroll/{payrollId}/details 는 근무일별 배열(PayrollDetailDto[])만 반환하는데
// 화면은 이를 { totalHours, totalPay, period, items } 형태의 요약 객체로 취급해 실수령액/근무시간/
// 상세 항목이 항상 비어 보였다. 수정 후에는 요약은 payrollService.getById(신설 GET
// /api/payroll/{payrollId})로, 근무일별 상세는 payrollService.getDetails(배열)로 각각 조회한다.
//
// (과거 이 파일은 Alert.alert 를 스파이했지만 실제 화면은 AppToast(리스너 패턴)를 사용한다 —
// AppToast 는 host 미마운트 상태에서도 no-op 이라 별도 모킹 없이 안전하게 호출된다.)

jest.mock('../../src/features/salary/services/payrollService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn(),
    getDetails: jest.fn(),
  },
}));

import payrollService from '../../src/features/salary/services/payrollService';
import SalaryDetailScreen from '../../src/features/salary/screens/SalaryDetailScreen';

const getByIdMock = payrollService.getById as jest.Mock;
const getDetailsMock = payrollService.getDetails as jest.Mock;

describe('SalaryDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('payrollId 가 없으면 잘못된 접근 상태를 보여준다', async () => {
    const {getByTestId} = render(<SalaryDetailScreen />);
    await waitFor(() => {
      expect(getByTestId('salary-detail-invalid')).toBeTruthy();
    });
    expect(getByIdMock).not.toHaveBeenCalled();
  });

  test('요약(getById)과 상세(getDetails, 배열)를 모두 조회해 실수령액·근무시간·상세 항목을 렌더한다', async () => {
    getByIdMock.mockResolvedValueOnce({
      payrollId: 1,
      employeeId: 10,
      storeId: 20,
      totalHours: 100,
      totalPay: 1_000_000,
      period: {startDate: '2025-10-01', endDate: '2025-10-31'},
      status: 'CONFIRMED',
    });
    getDetailsMock.mockResolvedValueOnce([
      {workDate: '2025-10-01', totalHours: 8, dailyWage: 100000},
    ]);

    const {getByTestId, findByText, findAllByText} = render(<SalaryDetailScreen route={{params: {payrollId: 1}}} />);

    expect(getByTestId('salary-detail-loading')).toBeTruthy();

    await waitFor(() => {
      expect(getByIdMock).toHaveBeenCalledWith(1);
      expect(getDetailsMock).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(getByTestId('salary-detail-success')).toBeTruthy();
    });
    expect(await findByText('급여 상세')).toBeTruthy();
    // 실수령액은 HeroNumber + 요약 Row 두 곳에 렌더된다
    expect((await findAllByText('1,000,000원')).length).toBeGreaterThanOrEqual(2);
    expect(await findByText('100h')).toBeTruthy();
    expect(await findByText('2025-10-01')).toBeTruthy();
  });

  test('상세 항목(getDetails)이 빈 배열이어도 요약은 정상 표시하고 상세는 빈 상태 문구를 보여준다', async () => {
    getByIdMock.mockResolvedValueOnce({
      payrollId: 2,
      employeeId: 10,
      storeId: 20,
      totalPay: 500_000,
    });
    getDetailsMock.mockResolvedValueOnce([]);

    const {getByTestId, findByText, findAllByText} = render(<SalaryDetailScreen route={{params: {payrollId: 2}}} />);

    await waitFor(() => {
      expect(getByTestId('salary-detail-success')).toBeTruthy();
    });
    expect(await findByText('상세 항목이 없어요.')).toBeTruthy();
    expect((await findAllByText('500,000원')).length).toBeGreaterThanOrEqual(2);
  });

  test('요약 조회(getById)가 실패하면 에러 상태를 보여준다', async () => {
    getByIdMock.mockRejectedValueOnce(new Error('Network'));
    getDetailsMock.mockResolvedValueOnce([]);

    const {getByTestId} = render(<SalaryDetailScreen route={{params: {payrollId: 3}}} />);

    await waitFor(() => {
      expect(getByTestId('salary-detail-error')).toBeTruthy();
    });
  });

  test('상세 조회(getDetails)가 실패해도 에러 상태를 보여준다 (Promise.all 이므로 둘 중 하나만 실패해도 실패 처리)', async () => {
    getByIdMock.mockResolvedValueOnce({payrollId: 4, employeeId: 10, storeId: 20});
    getDetailsMock.mockRejectedValueOnce(new Error('Network'));

    const {getByTestId} = render(<SalaryDetailScreen route={{params: {payrollId: 4}}} />);

    await waitFor(() => {
      expect(getByTestId('salary-detail-error')).toBeTruthy();
    });
  });
});
