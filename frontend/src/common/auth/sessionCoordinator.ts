/**
 * FE 세션 코디네이터 (WP-02) — refresh 실행의 단일 소유자.
 *
 * `common/api/client.ts`에 있던 `refreshAccessToken()` 구현을 그대로 옮겼다(동작 변경 없음).
 * TokenManager는 일부러 구 경로(`services/TokenManager`)에서 import한다 — 다수 기존 테스트가
 * `jest.mock('.../services/TokenManager', ...)`로 이 경로를 모킹하고 있어(sessionLifecycle.test.ts
 * 등), 코디네이터가 신 경로(`common/auth/tokenStore`)를 직접 import하면 그 모킹이 우회돼 실제
 * storage I/O를 타게 된다. `services/TokenManager.ts` 자체가 `tokenStore.ts`의 재-export이므로
 * 런타임 객체는 동일하다 — WP-10에서 구 경로 호출부가 모두 이관된 뒤에만 이 import를 정리한다.
 *
 * login/kakaoLogin/appleLogin/logout의 HTTP 호출(authService.ts)과 이를 감싸는 TanStack Query
 * 뮤테이션(useAuthQueries.ts)은 이번 증분에서 옮기지 않았다 — 인증 상태를 게이팅하는 코드라
 * 에뮬레이터 실기능 확인 없이는 병합 위험이 크다(과거 로그인 무한루프 이력 있음). 계획서가
 * 요구하는 최종 형태(AuthContext → sessionCoordinator → authService)로의 완전 이관은 후속 증분.
 */
import axios from 'axios';
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

export {subscribeSessionExpired} from './events';
