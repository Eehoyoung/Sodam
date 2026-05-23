import attendanceService from '../../src/features/attendance/services/attendanceService';

// Mock api client used by attendanceService
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

// Helper to get the mock functions regardless of default/named import
const getPostMock = () => (api.post as jest.Mock) || ((apiDefault as any).post as jest.Mock);

// [Test API Mapping] Ensure attendance service uses standard endpoints

describe('attendanceService (standard endpoints)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('checkIn calls POST /api/attendance/check-in with mapped storeId', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { id: 'a1', status: 'CHECKED_IN' } });

    const payload = {
      workplaceId: '123',
      latitude: 37.5,
      longitude: 127.0,
      timestamp: '2025-10-02T00:00:00Z',
      nfcTagId: 'TAG-1'
    } as any; // typing from project

    const resp = await attendanceService.checkIn(payload);

    const { workplaceId: _w1, ...rest1 } = payload;
    expect(postMock).toHaveBeenCalledWith('/api/attendance/check-in', {
      ...rest1,
      storeId: 123,
    });
    expect(resp).toEqual({ id: 'a1', status: 'CHECKED_IN' });
  });

  test('checkOutStandard calls POST /api/attendance/check-out with mapped storeId', async () => {
    const postMock = getPostMock();
    postMock.mockResolvedValueOnce({ data: { id: 'a1', status: 'CHECKED_OUT' } });

    const payload = {
      workplaceId: '77',
      latitude: 37.1,
      longitude: 127.1,
      timestamp: '2025-10-02T01:00:00Z',
    } as any;

    const resp = await attendanceService.checkOutStandard(payload);

    const { workplaceId: _w2, ...rest2 } = payload;
    expect(postMock).toHaveBeenCalledWith('/api/attendance/check-out', {
      ...rest2,
      storeId: 77,
    });
    expect(resp).toEqual({ id: 'a1', status: 'CHECKED_OUT' });
  });
});
