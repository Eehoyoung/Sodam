import breakRecordService from '../../src/features/attendance/services/breakRecordService';
import api from '../../src/common/api/client';

jest.mock('../../src/common/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

describe('breakRecordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('start posts to /api/stores/{storeId}/employees/me/breaks/start', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { id: 1, recordedBy: 'EMPLOYEE' } });
    const res = await breakRecordService.start(101);
    expect(api.post).toHaveBeenCalledWith('/api/stores/101/employees/me/breaks/start');
    expect(res.id).toBe(1);
  });

  test('end posts to /api/stores/{storeId}/employees/me/breaks/{id}/end', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { id: 1, breakEndTime: '2026-07-30T12:30:00' } });
    const res = await breakRecordService.end(101, 1);
    expect(api.post).toHaveBeenCalledWith('/api/stores/101/employees/me/breaks/1/end');
    expect(res.breakEndTime).toBe('2026-07-30T12:30:00');
  });

  test('list without range calls plain endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    await breakRecordService.list(101);
    expect(api.get).toHaveBeenCalledWith('/api/stores/101/employees/me/breaks');
  });

  test('list with from/to appends query string', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    await breakRecordService.list(101, '2026-07-01', '2026-07-31');
    expect(api.get).toHaveBeenCalledWith(
      '/api/stores/101/employees/me/breaks?from=2026-07-01&to=2026-07-31',
    );
  });
});
