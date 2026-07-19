/**
 * FE 공용 인증 타입 (WP-02).
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** 복원된 세션 — refreshToken은 없을 수 있다(access만 저장된 소셜 로그인 등). */
export interface Session {
  accessToken: string;
  refreshToken: string | null;
}
