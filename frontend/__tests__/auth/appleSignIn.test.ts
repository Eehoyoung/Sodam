import {appleAuth} from '@invertase/react-native-apple-authentication';
import {AppleSignInCancelledError, requestAppleIdentityToken} from '../../src/features/auth/native/appleSignIn';

describe('appleSignIn adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('정상 응답이면 identityToken을 반환한다', async () => {
    (appleAuth.performRequest as jest.Mock).mockResolvedValue({identityToken: 'token-abc'});

    const token = await requestAppleIdentityToken();

    expect(token).toBe('token-abc');
    expect(appleAuth.performRequest).toHaveBeenCalledWith({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
  });

  test('identityToken 없이 성공 응답이 오면 일반 Error를 던진다(SDK 오류)', async () => {
    (appleAuth.performRequest as jest.Mock).mockResolvedValue({identityToken: null});

    await expect(requestAppleIdentityToken()).rejects.toThrow('Apple 인증 토큰을 받지 못했어요.');
  });

  test('사용자가 시트를 닫으면(cancel) AppleSignInCancelledError를 던진다', async () => {
    (appleAuth.performRequest as jest.Mock).mockRejectedValue(new Error('The user canceled the authorization attempt.'));

    await expect(requestAppleIdentityToken()).rejects.toBeInstanceOf(AppleSignInCancelledError);
  });

  test('그 외 SDK 오류는 원본 에러를 그대로 던진다', async () => {
    const sdkError = new Error('Network request failed');
    (appleAuth.performRequest as jest.Mock).mockRejectedValue(sdkError);

    await expect(requestAppleIdentityToken()).rejects.toBe(sdkError);
  });
});
