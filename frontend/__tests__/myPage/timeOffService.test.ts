import timeOffService from '../../src/features/myPage/services/timeOffService';
import api from '../../src/common/utils/api';

jest.mock('../../src/common/utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// [Test Mapping] TimeOff APIs
// - POST /api/timeoff
// - GET /api/timeoff/store/{storeId}
// - GET /api/timeoff/store/{storeId}/status/{status}
// - GET /api/timeoff/employee/{employeeId}
// - PUT /api/timeoff/{requestId}/approve
// - PUT /api/timeoff/{requestId}/reject

describe('timeOffService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('create posts payload and returns id', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { id: 10 } });

    const res = await timeOffService.create({ employeeId: 1, storeId: 2, from: '2025-10-01', to: '2025-10-02', reason: '휴가' });

    expect(api.post).toHaveBeenCalledWith('/api/timeoff', { employeeId: 1, storeId: 2, from: '2025-10-01', to: '2025-10-02', reason: '휴가' });
    expect(res.id).toBe(10);
  });

  test('getStoreAll calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    await timeOffService.getStoreAll(5);
    expect(api.get).toHaveBeenCalledWith('/api/timeoff/store/5');
  });

  test('getByStatus calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    await timeOffService.getByStatus(5, 'PENDING');
    expect(api.get).toHaveBeenCalledWith('/api/timeoff/store/5/status/PENDING');
  });

  test('getEmployeeAll calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    await timeOffService.getEmployeeAll(7);
    expect(api.get).toHaveBeenCalledWith('/api/timeoff/employee/7');
  });

  test('approve and reject call correct endpoints', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });

    const a = await timeOffService.approve(123);
    expect(api.put).toHaveBeenCalledWith('/api/timeoff/123/approve');
    expect(a).toEqual({ success: true });

    const r = await timeOffService.reject(456);
    expect(api.put).toHaveBeenCalledWith('/api/timeoff/456/reject');
    expect(r).toEqual({ success: true });
  });
});
