import userService from '../../src/features/auth/services/userService';
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

// [Test Mapping] User APIs
// - POST /api/users/{userId}/purpose
// - GET /api/user/{userId}
// - PUT /api/user/{employeeId}

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setPurpose posts to correct endpoint', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const res = await userService.setPurpose(5, { purpose: 'EMPLOYER' });
    expect(api.post).toHaveBeenCalledWith('/api/users/5/purpose', { purpose: 'EMPLOYER' });
    expect(res).toEqual({ success: true });
  });

  test('getUser calls correct endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 7, name: 'Kim' } });
    const u = await userService.getUser(7);
    expect(api.get).toHaveBeenCalledWith('/api/user/7');
    expect(u.id).toBe(7);
  });

  test('updateEmployee calls correct endpoint', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { id: 9, name: 'Lee' } });
    const u = await userService.updateEmployee(9, { name: 'Lee' });
    expect(api.put).toHaveBeenCalledWith('/api/user/9', { name: 'Lee' });
    expect(u.name).toBe('Lee');
  });
});
