import api from '../../src/common/api/client';
import authApi from '../../src/features/auth/services/authApi';

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

    // api.get(url, params) — the second arg IS the params object (see common/api.ts).
    // Passing {params: {email}} here double-wraps it and the query string never gets sent.
    expect(api.get).toHaveBeenCalledWith('/api/auth/email-check', {email: 'user@example.com'});
  });

  test('join sends the public signup grade in the validated body, not an authority header', async () => {
    (api.post as jest.Mock).mockResolvedValue({data: {message: 'ok'}});

    await authApi.join(
      {name: '사장님', email: 'owner@example.com', password: 'Sodam123!'},
      {
        purpose: 'boss',
        userGrade: 'MASTER',
        consent: {age: true, terms: true, privacy: true, marketing: false},
      },
    );

    expect(api.post).toHaveBeenCalledWith(
      '/api/join',
      {
        name: '사장님',
        email: 'owner@example.com',
        password: 'Sodam123!',
        purpose: 'master',
        userGrade: 'MASTER',
        ageConfirmed: true,
        termsAgreed: true,
        privacyAgreed: true,
        marketingAgreed: false,
      },
      {headers: {'X-User-Purpose': 'master'}},
    );
  });
});
