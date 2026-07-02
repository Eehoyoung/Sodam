import payrollService from '../../src/features/salary/services/payrollService';

// Mock api client used by payrollService
jest.mock('../../src/common/utils/api', () => {
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

import apiDefault, { api } from '../../src/common/utils/api';

const getPostMock = () => (api.post as jest.Mock) || ((apiDefault as any).post as jest.Mock);
const getGetMock = () => (api.get as jest.Mock) || ((apiDefault as any).get as jest.Mock);
const getPutMock = () => (api.put as jest.Mock) || ((apiDefault as any).put as jest.Mock);

// [Test API Mapping] Ensure payroll service uses standardized endpoints

describe('payrollService (Phase 1 API mapping)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calculate calls POST /api/payroll/calculate with payload', async () => {
    const postMock = getPostMock();
    const payload = { employeeId: 7, storeId: 22, from: '2025-10-01', to: '2025-10-31' } as any;
    postMock.mockResolvedValueOnce({ data: { payrollId: 1, ...payload } });

    const resp = await payrollService.calculate(payload);

    expect(postMock).toHaveBeenCalledWith('/api/payroll/calculate', payload);
    expect(resp).toMatchObject({ payrollId: 1 });
  });

  test('getMonthly calls GET /api/payroll/employee/{eid}/store/{sid}/monthly with year & month params', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({ data: [{ employeeId: 7, storeId: 22 }] });

    const resp = await payrollService.getMonthly(7, 22, 2025, 10);

    expect(getMock).toHaveBeenCalledWith('/api/payroll/employee/7/store/22/monthly', { year: 2025, month: 10 });
    expect(Array.isArray(resp)).toBe(true);
  });

  test('getDetails calls GET /api/payroll/{payrollId}/details', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({ data: { payrollId: 999, employeeId: 7, storeId: 22 } });

    const resp = await payrollService.getDetails(999);

    expect(getMock).toHaveBeenCalledWith('/api/payroll/999/details');
    expect(resp).toMatchObject({ payrollId: 999 });
  });

  test('updateStatus calls PUT /api/payroll/{payrollId}/status with body { status }', async () => {
    const putMock = getPutMock();
    putMock.mockResolvedValueOnce({ data: { success: true } });

    const resp = await payrollService.updateStatus(999, 'PAID');

    expect(putMock).toHaveBeenCalledWith('/api/payroll/999/status', { status: 'PAID' });
    expect(resp).toEqual({ success: true });
  });
});
