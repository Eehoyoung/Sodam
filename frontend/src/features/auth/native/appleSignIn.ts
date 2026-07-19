/**
 * Apple SDK 직접 호출을 격리하는 플랫폼 adapter (WP-02).
 * `LoginScreen.tsx`가 `@invertase/react-native-apple-authentication`을 직접 import하던 것을
 * 이 파일로 옮겨, 화면은 "identityToken을 받거나 취소당한다"는 계약만 알면 되게 한다.
 * Android에서는 이 모듈을 호출하지 않는다(버튼 자체를 노출하지 않음, LoginScreen.tsx의
 * Platform.OS === 'ios' 분기가 그대로 담당).
 */
import {appleAuth} from '@invertase/react-native-apple-authentication';

export class AppleSignInCancelledError extends Error {
  constructor() {
    super('Apple 로그인이 취소됐어요.');
    this.name = 'AppleSignInCancelledError';
  }
}

/**
 * iOS 네이티브 Apple 로그인 시트를 띄우고 identityToken을 반환한다.
 * - 사용자가 시트를 닫으면 AppleSignInCancelledError를 던진다(호출부는 조용히 무시해야 함).
 * - SDK가 identityToken 없이 성공 응답을 주는 비정상 케이스는 일반 Error로 던진다.
 */
export async function requestAppleIdentityToken(): Promise<string> {
  try {
    const response = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const {identityToken} = response;
    if (!identityToken) {
      throw new Error('Apple 인증 토큰을 받지 못했어요.');
    }
    return identityToken;
  } catch (error: any) {
    const message = String(error?.message ?? '');
    if (/cancel/i.test(message)) {
      throw new AppleSignInCancelledError();
    }
    throw error;
  }
}
