import api from '../../src/common/utils/api';
import authApi from '../../src/features/auth/services/authApi';

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

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('setPurpose sends backend purpose vocabulary', async () => {
    (api.post as jest.Mock).mockResolvedValue({data: {success: true}});

    await authApi.setPurpose(9, 'boss');

    expect(api.post).toHaveBeenCalledWith('/api/users/9/purpose', {
      purpose: 'boss',
      userGrade: 'MASTER',
    });
  });
});
