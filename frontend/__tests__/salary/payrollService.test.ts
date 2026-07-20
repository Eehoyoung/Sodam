import payrollService from '../../src/features/salary/services/payrollService';

// Mock api client used by payrollService
jest.mock('../../src/common/api/client', () => {
  const post = jest.fn();
  const get = jest.fn();
  const put = jest.fn();
  const del = jest.fn();
  return {
    __esModule: true,
    default: { post, get, put, delete: del },
    api: { post, get, put, delete: del }
  };
});

import apiDefault, { api } from '../../src/common/api/client';

const getPostMock = () => (api.post as jest.Mock) || ((apiDefault as any).post as jest.Mock);
const getGetMock = () => (api.get as jest.Mock) || ((apiDefault as any).get as jest.Mock);
const getPutMock = () => (api.put as jest.Mock) || ((apiDefault as any).put as jest.Mock);

// [Test API Mapping] Ensure payroll service uses standardized endpoints

describe('payrollService (Phase 1 API mapping)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // WP-04: PayrollRunScreen.tsx가 직접 api.post 하던 매장 전체 계산 로직을 이관하면서
  // BE 실제 응답 형태(배열, employee.id/employee.user.name 중첩)에 맞춰 계약을 정정했다 —
  // 과거 이 테스트는 BE가 단일 객체를 반환한다고 잘못 가정하고 있었다(실제 화면 미사용 상태였음).
  test('calculate calls POST /api/payroll/calculate with payload and maps BE 배열 응답(employee.id/employee.user.name 중첩) 을 평탄화한다', async () => {
    const postMock = getPostMock();
    const payload = { employeeId: 7, storeId: 22, startDate: '2025-10-01', endDate: '2025-10-31' } as any;
    postMock.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          employee: { id: 7, user: { name: '홍길동' } },
          regularHours: 160,
          regularWage: 1_600_000,
          netWage: 1_500_000,
        },
      ],
    });

    const resp = await payrollService.calculate(payload);

    expect(postMock).toHaveBeenCalledWith('/api/payroll/calculate', payload);
    expect(resp).toEqual([
      expect.objectContaining({
        payrollId: 1,
        employeeId: 7,
        employeeName: '홍길동',
        regularHours: 160,
        regularWage: 1_600_000,
        netWage: 1_500_000,
      }),
    ]);
  });

  test('getMonthly calls GET /api/payroll/employee/{eid}/store/{sid}/monthly with year & month params', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({ data: [{ employeeId: 7, storeId: 22 }] });

    const resp = await payrollService.getMonthly(7, 22, 2025, 10);

    expect(getMock).toHaveBeenCalledWith('/api/payroll/employee/7/store/22/monthly', { year: 2025, month: 10 });
    expect(Array.isArray(resp)).toBe(true);
  });

  test('getDetails calls GET /api/payroll/{payrollId}/details and returns the raw array (BE returns PayrollDetailDto[], not a summary object)', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({
      data: [{ id: 1, payrollId: 999, workDate: '2026-05-01', totalHours: 8, dailyWage: 96000 }],
    });

    const resp = await payrollService.getDetails(999);

    expect(getMock).toHaveBeenCalledWith('/api/payroll/999/details');
    expect(Array.isArray(resp)).toBe(true);
    expect(resp).toHaveLength(1);
    expect(resp[0]).toMatchObject({ payrollId: 999, workDate: '2026-05-01', dailyWage: 96000 });
  });

  test('getDetails returns [] when BE response is not an array (defensive against summary-object regression)', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({ data: { payrollId: 999, employeeId: 7, storeId: 22 } });

    const resp = await payrollService.getDetails(999);

    expect(resp).toEqual([]);
  });

  test('updateStatus calls PUT /api/payroll/{payrollId}/status with body { status }', async () => {
    const putMock = getPutMock();
    putMock.mockResolvedValueOnce({ data: { success: true } });

    const resp = await payrollService.updateStatus(999, 'PAID');

    expect(putMock).toHaveBeenCalledWith('/api/payroll/999/status', { status: 'PAID' });
    expect(resp).toEqual({ success: true });
  });

  // BE PayrollDto (backend/dto/response/PayrollDto.java) 는 id/netWage/평평한 startDate·endDate 필드를 가진다.
  // FE 화면은 payrollId/totalPay/nested period 를 기대하므로 서비스 레이어가 반드시 변환해야 한다 (§1-1/§1-2 회귀 방지).
  describe('getById (신설 — GET /api/payroll/{payrollId})', () => {
    test('BE PayrollDto(id/netWage/flat dates) 를 PayrollSummary(payrollId/totalPay/nested period) 로 정규화', async () => {
      const getMock = getGetMock();
      getMock.mockResolvedValueOnce({
        data: {
          id: 100,
          employeeId: 7,
          employeeName: '홍길동',
          storeId: 22,
          storeName: '카페 소담',
          startDate: '2026-05-01',
          endDate: '2026-05-31',
          totalHours: 160,
          netWage: 2_000_000,
          status: 'CONFIRMED',
        },
      });

      const resp = await payrollService.getById(100);

      expect(getMock).toHaveBeenCalledWith('/api/payroll/100');
      expect(resp).toMatchObject({
        payrollId: 100,
        totalPay: 2_000_000,
        totalHours: 160,
        status: 'CONFIRMED',
        period: { startDate: '2026-05-01', endDate: '2026-05-31' },
      });
    });
  });

  describe('listByStore / listByEmployee — BE PayrollDto[] 정규화', () => {
    test('listByStore: id→payrollId, netWage→totalPay, 평평한 날짜→nested period', async () => {
      const getMock = getGetMock();
      getMock.mockResolvedValueOnce({
        data: [
          { id: 1, employeeId: 7, employeeName: '홍길동', storeId: 22, startDate: '2026-05-01', endDate: '2026-05-31', netWage: 1_800_000, totalHours: 150, status: 'PAID' },
        ],
      });

      const resp = await payrollService.listByStore(22);

      expect(getMock).toHaveBeenCalledWith('/api/payroll/store/22', { startDate: undefined, endDate: undefined });
      expect(resp).toHaveLength(1);
      expect(resp[0]).toMatchObject({
        payrollId: 1,
        totalPay: 1_800_000,
        status: 'PAID',
        period: { startDate: '2026-05-01', endDate: '2026-05-31' },
      });
    });

    test('listByEmployee: 동일하게 정규화', async () => {
      const getMock = getGetMock();
      getMock.mockResolvedValueOnce({
        data: [{ id: 2, employeeId: 7, storeId: 22, startDate: '2026-04-01', endDate: '2026-04-30', netWage: 1_500_000 }],
      });

      const resp = await payrollService.listByEmployee(7);

      expect(resp[0].payrollId).toBe(2);
      expect(resp[0].totalPay).toBe(1_500_000);
      expect(resp[0].period).toEqual({ startDate: '2026-04-01', endDate: '2026-04-30' });
    });
  });
});
