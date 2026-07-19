/**
 * FE 세션 코디네이터 (WP-02) — refresh 실행 + login/kakaoLogin/appleLogin/logout 오케스트레이션의
 * 단일 소유자 (Phase E, WP-02 2단계).
 *
 * `common/api/client.ts`에 있던 `refreshAccessToken()` 구현을 그대로 옮겼다(동작 변경 없음).
 * TokenManager는 일부러 구 경로(`services/TokenManager`)에서 import한다 — 다수 기존 테스트가
 * `jest.mock('.../services/TokenManager', ...)`로 이 경로를 모킹하고 있어(sessionLifecycle.test.ts
 * 등), 코디네이터가 신 경로(`common/auth/tokenStore`)를 직접 import하면 그 모킹이 우회돼 실제
 * storage I/O를 타게 된다. `services/TokenManager.ts` 자체가 `tokenStore.ts`의 재-export이므로
 * 런타임 객체는 동일하다 — WP-10에서 구 경로 호출부가 모두 이관된 뒤에만 이 import를 정리한다.
 *
 * login/kakaoLogin/appleLogin/logout — 실제 HTTP 호출·응답 매핑·토큰 반영 구현은 여전히
 * `features/auth/services/authService.ts`가 소유한다. 이 파일은 계획서가 요구하는 최종 형태
 * (AuthContext → sessionCoordinator → authService)의 오케스트레이션 진입점만 통일한다 —
 * `useAuthQueries.ts`의 뮤테이션이 이제 authService 대신 이 함수들을 호출해, sessionCoordinator가
 * 실제 호출 경로에 들어선다. authService.ts의 구현을 그대로 이 파일로 물리 이동하지 않은 이유는
 * authService가 내부에서 `common/api/client.ts`(인터셉터 포함 axios 인스턴스)를 쓰는데, client.ts는
 * 이미 `refresh`를 이 파일에서 import하고 있어 — 만약 이 파일도 authService의 HTTP 호출 코드를
 * 그대로 흡수하면 client.ts를 직접 import하게 되어 client.ts ↔ sessionCoordinator 순환 참조가
 * 새로 생긴다. 대신 이 파일은 authService 모듈을 참조만 하고(함수 바디 안에서만 접근 — 순환 참조가
 * 있어도 모듈 최상위 평가 시점엔 아무것도 읽지 않으므로 안전), 실제 axios 인스턴스 의존은
 * authService.ts 쪽에만 남긴다. `AuthContext.tsx`의 login/kakaoLogin/appleLogin/logout 함수 자체를
 * TanStack Query 뮤테이션 밖으로 완전히 빼내는 작업(로딩 상태·쿼리 캐시 동기화 재설계 필요 —
 * `AppNavigator.tsx`·`useOfflineSync.ts`·`ProfileBasicsScreen.tsx`·`ConsentScreen.tsx`가 모두
 * `queryKeys.auth.*` 캐시를 직접 읽고 쓰고 있어 파급 범위가 이 증분 범위를 넘는다)는 후속 증분.
 */
import axios from 'axios';
import authService, {type AuthResponse, type LoginRequest} from '../../features/auth/services/authService';
import TokenManager from '../../services/TokenManager';
import {env} from '../config/env';

const BASE_URL = env.apiBaseUrl;

async function requestRefresh(refreshToken: string): Promise<{accessToken: string; refreshToken: string}> {
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {refreshToken}, {timeout: 10000});
    const newAccess = res.data?.accessToken || res.data?.data?.accessToken;
    const rotatedRefresh = res.data?.refreshToken || res.data?.data?.refreshToken || refreshToken;
    if (!newAccess) {throw new Error('INVALID_REFRESH_RESPONSE');}
    return {accessToken: newAccess, refreshToken: rotatedRefresh};
  } catch (e: any) {
    // 404/405 등일 경우 폴백 시도
    if (e?.response?.status === 404 || e?.response?.status === 405) {
      const res = await axios.post(`${BASE_URL}/api/refresh`, {refreshToken}, {timeout: 10000});
      const newAccess = res.data?.accessToken || res.data?.data?.accessToken;
      const rotatedRefresh = res.data?.refreshToken || res.data?.data?.refreshToken || refreshToken;
      if (!newAccess) {throw new Error('INVALID_REFRESH_RESPONSE');}
      return {accessToken: newAccess, refreshToken: rotatedRefresh};
    }
    throw e;
  }
}

/** access token 갱신 — 성공 시 tokenStore에 원자적으로 반영하고 새 accessToken을 반환한다. */
export async function refresh(): Promise<string> {
  const refreshToken = await TokenManager.getRefresh();
  if (!refreshToken) {throw new Error('NO_REFRESH_TOKEN');}

  const {accessToken, refreshToken: rotatedRefresh} = await requestRefresh(refreshToken);
  await TokenManager.setTokens({accessToken, refreshToken: rotatedRefresh});
  return accessToken;
}

/** 이메일 로그인 — 실제 구현은 authService.login 위임(동작 변경 없음). */
export async function login(request: LoginRequest): Promise<AuthResponse> {
    return authService.login(request);
}

/** 카카오 로그인 콜백 처리 — 실제 구현은 authService.kakaoLogin 위임(동작 변경 없음). */
export async function kakaoLogin(code: string): Promise<AuthResponse> {
    return authService.kakaoLogin(code);
}

/** Sign in with Apple — 실제 구현은 authService.appleLogin 위임(동작 변경 없음). */
export async function appleLogin(identityToken: string): Promise<AuthResponse> {
    return authService.appleLogin(identityToken);
}

/** 로그아웃 — 실제 구현은 authService.logout 위임(동작 변경 없음). */
export async function logout(): Promise<void> {
    return authService.logout();
}

export {subscribeSessionExpired, emitSessionExpired} from './events';
