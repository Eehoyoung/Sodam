import api from '../../src/common/api/client';
import authService from '../../src/features/auth/services/authService';
import TokenManager from '../../src/common/auth/tokenStore';

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

describe('authService FE-BE contract', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await TokenManager.clear();
  });

  test('login reads tokens from ApiResponse.data and stores them', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          userId: 3,
          userGrade: 'ROLE_MASTER',
        },
      },
    });

    const response = await authService.login({email: 'owner@example.com', password: 'Sodam123!'});

    expect(api.post).toHaveBeenCalledWith('/api/login', {
      email: 'owner@example.com',
      password: 'Sodam123!',
    });
    expect(response.user).toEqual({
      id: 3,
      name: '',
      email: '',
      phone: undefined,
      role: 'MASTER',
      profileCompleted: undefined,
      consentCompleted: undefined,
      locationConsented: undefined,
    });
    await expect(TokenManager.getTokens()).resolves.toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
  });

  test('appleLogin posts identityToken to /apple/auth/proc and stores tokens', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        message: 'ok',
        data: {
          accessToken: 'access-apple-1',
          refreshToken: 'refresh-apple-1',
          userId: 7,
          userGrade: 'ROLE_PERSONAL',
        },
      },
    });

    const response = await authService.appleLogin('mock-identity-token');

    expect(api.post).toHaveBeenCalledWith('/apple/auth/proc', {identityToken: 'mock-identity-token'});
    expect(response.user.id).toBe(7);
    await expect(TokenManager.getTokens()).resolves.toEqual({
      accessToken: 'access-apple-1',
      refreshToken: 'refresh-apple-1',
    });
  });

  test('signup treats tokenless /api/join success as success', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        message: 'joined',
      },
    });

    await expect(authService.signup({
      name: 'Kim',
      email: 'kim@example.com',
      password: 'Sodam123!',
      role: 'PERSONAL',
      ageConfirmed: true,
      termsAgreed: true,
      privacyAgreed: true,
      marketingAgreed: false,
    })).resolves.toEqual({success: true, message: 'joined'});

    expect(api.post).toHaveBeenCalledWith('/api/join', {
      name: 'Kim',
      email: 'kim@example.com',
      password: 'Sodam123!',
      phone: undefined,
      userGrade: 'Personal',
      ageConfirmed: true,
      termsAgreed: true,
      privacyAgreed: true,
      marketingAgreed: false,
    });
    await expect(TokenManager.getTokens()).resolves.toBeNull();
  });
});
