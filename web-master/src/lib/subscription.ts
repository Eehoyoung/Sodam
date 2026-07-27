import { apiFetch } from "./api";

export type PlanType = "FREE" | "STARTER" | "PRO" | "BUSINESS";
export type SubscriptionStatus = "PENDING_PAYMENT" | "ACTIVE" | "PAST_DUE" | "PAUSED" | "CANCELLED" | "EXPIRED";
export type BillingCycle = "MONTHLY" | "YEARLY";

export interface SubscriptionInfo {
  id: number;
  plan: PlanType;
  status: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  cardLabel: string | null;
  currentPeriodEndAt: string | null;
  nextBillingAt: string | null;
}

export interface PlanCatalogItem {
  name: PlanType;
  displayName: string;
  monthlyPriceKrw: number;
  description: string;
  paid: boolean;
  employeeLimit: number | null;
  features: string[];
}

/** 내 구독 조회 — GET /api/billing/me. 구독 이력이 없으면 204(undefined → null로 정규화). */
export async function fetchMySubscription(): Promise<SubscriptionInfo | null> {
  const result = await apiFetch<SubscriptionInfo | undefined>("/api/billing/me");
  return result ?? null;
}

/** 플랜 카탈로그(정적) — GET /api/billing/plans. */
export function fetchPlanCatalog(): Promise<PlanCatalogItem[]> {
  return apiFetch<PlanCatalogItem[]>("/api/billing/plans");
}

/**
 * 무료 플랜 가입 — POST /api/billing/subscribe/free. 카드 정보 불필요.
 * ⚠️ 유료 플랜 결제(POST /api/billing/subscribe)는 Toss Web SDK 연동이 필요한데, 계약 확인 전까지
 * 착수 금지(08_개발로드맵.md §Toss 게이트) — 이 파일에 의도적으로 배선하지 않았다.
 */
export function subscribeFree(): Promise<SubscriptionInfo> {
  return apiFetch<SubscriptionInfo>("/api/billing/subscribe/free", { method: "POST" });
}

/** 구독 해지 — DELETE /api/billing/cancel. 다음 결제일까지는 ACTIVE 유지. */
export function cancelSubscription(): Promise<void> {
  return apiFetch<void>("/api/billing/cancel", { method: "DELETE" });
}

/** 구독 일시정지(비수기) — POST /api/billing/pause. */
export function pauseSubscription(): Promise<SubscriptionInfo> {
  return apiFetch<SubscriptionInfo>("/api/billing/pause", { method: "POST" });
}

/** 구독 재개 — POST /api/billing/resume. */
export function resumeSubscription(): Promise<SubscriptionInfo> {
  return apiFetch<SubscriptionInfo>("/api/billing/resume", { method: "POST" });
}
