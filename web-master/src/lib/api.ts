import { API_BASE_URL } from "./env";

/** 백엔드가 Double-Submit-Cookie CSRF 토큰을 담아 내려주는 non-HttpOnly 쿠키 이름. */
const CSRF_COOKIE_NAME = "sodam_web_csrf";
const CSRF_HEADER_NAME = "X-Sodam-CSRF";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

/**
 * 세션 쿠키(sodam_web_sid) 기반 인증 API 클라이언트.
 * - credentials: 'include' — 쿠키를 항상 함께 전송(브라우저가 자동 첨부)
 * - 상태변경(POST/PUT/PATCH/DELETE) 요청에는 CSRF 헤더를 자동으로 실어 보낸다
 *   (04_보안정책.md §2 Double Submit Cookie — 로그인 자체는 CSRF 토큰이 아직 없으므로 예외)
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message =
      (body && (body.message ?? body.error)) ?? `요청이 실패했습니다 (${res.status})`;
    const errorCode = body?.errorCode ?? body?.code;
    throw new ApiError(res.status, message, errorCode);
  }

  return body as T;
}

/** 기존 백엔드 컨트롤러 다수가 쓰는 {success,message,data,errorCode} 봉투 — 벗겨서 data 만 반환. */
interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * `ApiResponse<T>`(성공 봉투)로 응답하는 기존 엔드포인트 전용 래퍼.
 * 모든 기존 컨트롤러가 봉투를 쓰는 건 아니다(예: 매장/직원 목록은 raw 배열을 그대로 반환) —
 * 호출 전 실제 컨트롤러 코드로 봉투 여부를 확인하고 알맞은 함수를 골라 쓸 것.
 */
export async function apiFetchEnveloped<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const envelope = await apiFetch<ApiEnvelope<T>>(path, options);
  return envelope.data;
}
