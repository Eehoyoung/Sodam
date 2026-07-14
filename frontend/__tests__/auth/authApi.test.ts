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

  test('checkEmail passes params directly (not double-wrapped under {params})', async () => {
    (api.get as jest.Mock).mockResolvedValue({data: {data: {available: true}}});

    await authApi.checkEmail('user@example.com');

    // api.get(url, params) — the second arg IS the params object (see common/utils/api.ts).
    // Passing {params: {email}} here double-wraps it and the query string never gets sent.
    expect(api.get).toHaveBeenCalledWith('/api/auth/email-check', {email: 'user@example.com'});
  });
});
