import wageService from '../../src/features/wage/services/wageService';

// Mock api client used by wageService
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

// [Test API Mapping] Ensure wage service uses standardized endpoints

describe('wageService (Phase 1 API mapping)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('putStandardHourlyWage calls PUT /api/wages/store/{storeId}/standard with query param', async () => {
    const putMock = getPutMock();
    putMock.mockResolvedValueOnce({ data: { success: true } });

    const resp = await wageService.putStandardHourlyWage(10, 9500);

    expect(putMock).toHaveBeenCalledWith('/api/wages/store/10/standard', undefined, {
      params: { standardHourlyWage: 9500 },
    });
    expect(resp).toEqual({ success: true });
  });

  test('getEmployeeWage calls GET /api/wages/employee/{employeeId}/store/{storeId}', async () => {
    const getMock = getGetMock();
    getMock.mockResolvedValueOnce({ data: { employeeId: 5, storeId: 10, hourlyWage: 12000 } });

    const resp = await wageService.getEmployeeWage(5, 10);

    expect(getMock).toHaveBeenCalledWith('/api/wages/employee/5/store/10');
    expect(resp).toEqual({ employeeId: 5, storeId: 10, hourlyWage: 12000 });
  });

  test('upsertEmployeeWage calls POST /api/wages/employee with payload', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { employeeId: 5, storeId: 10, hourlyWage: 13000 } });

    const payload = { employeeId: 5, storeId: 10, hourlyWage: 13000 };
    const resp = await wageService.upsertEmployeeWage(payload);

    expect(postMock).toHaveBeenCalledWith('/api/wages/employee', payload);
    expect(resp).toEqual(payload);
  });
});
