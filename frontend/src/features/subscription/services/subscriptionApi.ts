import api from '../../../common/utils/api';

export type PlanType = 'FREE' | 'STARTER' | 'PRO' | 'PREMIUM';
export type SubscriptionStatus =
    | 'PENDING_PAYMENT'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'PAUSED'
    | 'CANCELLED'
    | 'EXPIRED';

/** 결제 주기. BE enum 과 1:1 매핑. */
export type BillingCycle = 'MONTHLY' | 'HALF_YEARLY' | 'YEARLY';

export interface SubscriptionResponse {
    id: number;
    plan: PlanType;
    status: SubscriptionStatus;
    billingCycle?: BillingCycle | null;
    cardLabel?: string | null;
    currentPeriodEndAt?: string | null;
    nextBillingAt?: string | null;
}

export interface PlanCatalogItem {
    name: PlanType;
    displayName: string;
    monthlyPriceKrw: number;
    description: string;
    /** null 이면 직원 무제한 */
    employeeLimit?: number | null;
    features?: string[];
}

/** BE /api/billing/plans 의 원시 응답 형태 (런타임 매핑용). */
interface RawPlan {
    name?: string;
    displayName?: string;
    monthlyPriceKrw?: number;
    description?: string;
    paid?: boolean;
    employeeLimit?: number | null;
    features?: string[];
}

/**
 * 소담 구독·결제 API 래퍼.
 *
 * 일반 흐름:
 *  1. 토스 SDK 로 카드 인증 → authKey 획득
 *  2. subscribePaid(plan, authKey, billingCycle) → 빌링키 발급 + 첫 청구
 *  3. 이후 getMyCurrent / pause / resume / cancel 로 관리
 */
export const subscriptionApi = {
    async getPlans(): Promise<PlanCatalogItem[]> {
        const res = await api.get<RawPlan[]>('/api/billing/plans');
        const data: RawPlan[] = Array.isArray(res.data) ? res.data : [];
        // BE는 enum 기반 배열을 반환하므로 클라이언트 표시용 매핑 (null 안전)
        return data.map((p): PlanCatalogItem => ({
            name: (p.name ?? 'FREE') as PlanType,
            displayName: p.displayName ?? '',
            monthlyPriceKrw: p.monthlyPriceKrw ?? 0,
            description: p.description ?? '',
            employeeLimit: p.employeeLimit ?? null,
            features: Array.isArray(p.features) ? p.features : [],
        }));
    },

    async getMyCurrent(): Promise<SubscriptionResponse | null> {
        try {
            const res = await api.get<SubscriptionResponse>('/api/billing/me');
            // 204 No Content → 본문 없음
            return res.data ?? null;
        } catch (e: unknown) {
            const status = (e as {response?: {status?: number}})?.response?.status;
            if (status === 204 || status === 404) {
                return null;
            }
            throw e;
        }
    },

    async subscribeFree(): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/subscribe/free');
        return res.data;
    },

    async subscribePaid(
        plan: PlanType,
        authKey: string,
        billingCycle: BillingCycle = 'MONTHLY',
    ): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/subscribe', {
            plan,
            authKey,
            billingCycle,
        });
        return res.data;
    },

    async pause(): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/pause');
        return res.data;
    },

    async resume(): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/resume');
        return res.data;
    },

    async cancel(): Promise<void> {
        await api.delete<void>('/api/billing/cancel');
    },
};

export default subscriptionApi;
