import storeService from '../../src/features/store/services/storeService';
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

// [Test Mapping] Store APIs
// - PUT /api/stores/{storeId}/location
// - POST /api/stores/change/master

describe('storeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('putLocation calls correct endpoint and returns success', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await storeService.putLocation(123, { latitude: 37.5, longitude: 127.0, radius: 50 });

    expect(api.put).toHaveBeenCalledWith('/api/stores/123/location', { latitude: 37.5, longitude: 127.0, radius: 50 });
    expect(result).toEqual({ success: true });
  });

  test('changeOwner posts correct body and returns success', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    const result = await storeService.changeOwner(77, 999);

    expect(api.post).toHaveBeenCalledWith('/api/stores/change/master', { storeId: 77, newOwnerUserId: 999 });
    expect(result).toEqual({ success: true });
  });
});
