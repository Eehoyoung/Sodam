import { apiFetch } from "./api";

/** UserGrade.getValue() 원문(ROLE_* 접두사) — 백엔드가 그대로 내려주는 값. */
export type UserGrade = "ROLE_MASTER" | "ROLE_EMPLOYEE" | "ROLE_MANAGER" | "ROLE_BOSS" | "ROLE_PERSONAL";

export interface WebSessionUser {
  id: number;
  email: string;
  name: string;
  userGrade: UserGrade;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface WebLoginResponseData {
  userId: number;
  userGrade: UserGrade;
  name: string;
  csrfToken: string;
}

/**
 * `/api/web/auth/login`은 기존 `/api/login`(모바일)과 동일하게 `ApiResponse` 봉투로 응답한다
 * (`.claude/rules/api-design.md` 관례). 반면 `/api/web/auth/me`는 기존 `/api/auth/me`처럼 원시
 * 객체를 그대로 반환한다 — 두 신규 엔드포인트가 각자 대응하는 기존 모바일 엔드포인트의 응답 형태를
 * 그대로 계승했기 때문에 서로 다르다. 로그인 응답에는 email 이 없으므로, 로그인 성공 후
 * fetchCurrentUser() 로 한 번 더 조회해 완전한 WebSessionUser 를 만든다.
 */
export async function login(email: string, password: string): Promise<WebSessionUser> {
  await apiFetch<ApiEnvelope<WebLoginResponseData>>("/api/web/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return fetchCurrentUser();
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/web/auth/logout", { method: "POST" });
}

export function fetchCurrentUser(): Promise<WebSessionUser> {
  return apiFetch<WebSessionUser>("/api/web/auth/me");
}
