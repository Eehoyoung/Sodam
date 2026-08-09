import { API_BASE_URL } from "./env";

/**
 * 비로그인 공개 API 클라이언트 (WP-A).
 *
 * 기존 {@link import("./api").apiFetch} 와 분리한 이유는 그쪽이 세션 쿠키(credentials: 'include')와
 * CSRF 헤더를 항상 실어 보내기 때문이다. 공개 계산기는 인증이 없고 상태를 바꾸지도 않으므로
 * 쿠키를 보낼 이유가 없다 — 보내면 불필요하게 세션을 노출하는 셈이 된다.
 */
export class PublicApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function publicFetch<T>(
  path: string,
  params: Record<string, string | number>,
): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );

  const res = await fetch(`${API_BASE_URL}${path}?${query}`, {
    method: "GET",
    // 쿠키를 붙이지 않는다 — 공개 계산기는 누가 호출했는지 알 필요가 없다.
    credentials: "omit",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new PublicApiError(429, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    }
    if (res.status === 400) {
      throw new PublicApiError(400, "입력값을 다시 확인해 주세요.");
    }
    throw new PublicApiError(res.status, "계산에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  return (await res.json()) as T;
}

// ── 응답 타입 — BE PublicCalculatorResponse 와 1:1 ──────────────────

export interface WeeklyHolidayResult {
  eligible: boolean;
  weeklyHours: number;
  hourlyWage: number;
  allowanceHours: number;
  weeklyAllowance: number;
  notices: string[];
  disclaimer: string[];
}

export interface MinimumWageResult {
  year: number;
  hourlyWage: number;
  minimumWage: number;
  meetsMinimum: boolean;
  shortfall: number;
  disclaimer: string[];
}

export interface SocialInsuranceResult {
  grossWage: number;
  nationalPension: number;
  healthInsurance: number;
  longTermCare: number;
  employmentIns: number;
  total: number;
  netEstimate: number;
  notices: string[];
  disclaimer: string[];
}

export const publicCalculators = {
  weeklyHoliday: (weeklyHours: number, hourlyWage: number) =>
    publicFetch<WeeklyHolidayResult>("/api/public/calculators/weekly-holiday", {
      weeklyHours,
      hourlyWage,
    }),

  minimumWage: (hourlyWage: number) =>
    publicFetch<MinimumWageResult>("/api/public/calculators/minimum-wage", {
      hourlyWage,
    }),

  socialInsurance: (monthlyWage: number) =>
    publicFetch<SocialInsuranceResult>("/api/public/calculators/social-insurance", {
      monthlyWage,
    }),
};
