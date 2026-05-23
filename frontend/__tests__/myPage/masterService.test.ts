import masterService from '../../src/features/myPage/services/masterService';
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

// [Test Mapping] Master MyPage APIs
// - GET /api/master/mypage
// - GET/PUT /api/master/profile
// - GET /api/master/stores
// - GET /api/master/stats/store/{storeId}
// - GET /api/master/stats/overall
// - GET /api/master/timeoff/pending
// - PUT /api/master/timeoff/{requestId}/approve|reject

describe('masterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mypage calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { ok: true } });
    await masterService.mypage();
    expect(api.get).toHaveBeenCalledWith('/api/master/mypage');
  });

  test('getProfile and putProfile call correct endpoints', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 1 } });
    (api.put as jest.Mock).mockResolvedValue({ data: { id: 1, name: 'A' } });

    await masterService.getProfile();
    expect(api.get).toHaveBeenCalledWith('/api/master/profile');

    await masterService.putProfile({ name: 'A' });
    expect(api.put).toHaveBeenCalledWith('/api/master/profile', { name: 'A' });
  });

  test('stores and stats endpoints', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });

    await masterService.stores();
    expect(api.get).toHaveBeenCalledWith('/api/master/stores');

    await masterService.storeStats(33);
    expect(api.get).toHaveBeenCalledWith('/api/master/stats/store/33');

    await masterService.overallStats();
    expect(api.get).toHaveBeenCalledWith('/api/master/stats/overall');
  });

  test('timeoff pending and actions', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: [] });
    (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });

    await masterService.timeoffPending();
    expect(api.get).toHaveBeenCalledWith('/api/master/timeoff/pending');

    await masterService.approve(44);
    expect(api.put).toHaveBeenCalledWith('/api/master/timeoff/44/approve');

    await masterService.reject(45);
    expect(api.put).toHaveBeenCalledWith('/api/master/timeoff/45/reject');
  });
});
