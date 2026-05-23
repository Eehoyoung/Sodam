import api from '../../../common/utils/api';

export type PlanType = 'FREE' | 'BUSINESS' | 'PREMIUM' | 'COMMISSION';
export type SubscriptionStatus =
    | 'PENDING_PAYMENT'
    | 'ACTIVE'
    | 'PAST_DUE'
    | 'CANCELLED'
    | 'EXPIRED';

export interface SubscriptionResponse {
    id: number;
    plan: PlanType;
    status: SubscriptionStatus;
    cardLabel?: string | null;
    currentPeriodEndAt?: string | null;
    nextBillingAt?: string | null;
}

export interface PlanCatalogItem {
    name: PlanType;
    displayName: string;
    monthlyPriceKrw: number;
    description: string;
}

/**
 * 소담 구독·결제 API 래퍼.
 *
 * 일반 흐름:
 *  1. 토스 SDK 로 카드 인증 → authKey 획득
 *  2. subscribePaid(plan, authKey) → 빌링키 발급 + 첫 청구
 *  3. 이후 getMyCurrent / cancel 로 관리
 */
export const subscriptionApi = {
    async getPlans(): Promise<PlanCatalogItem[]> {
        const res = await api.get<PlanCatalogItem[] | any[]>('/api/billing/plans');
        const data = (res.data as any[]) ?? [];
        // BE는 enum 배열을 반환하므로 클라이언트 표시용 매핑
        return data.map((p: any) => ({
            name: p.name as PlanType,
            displayName: p.displayName,
            monthlyPriceKrw: p.monthlyPriceKrw,
            description: p.description,
        }));
    },

    async getMyCurrent(): Promise<SubscriptionResponse | null> {
        try {
            const res = await api.get<SubscriptionResponse>('/api/billing/me');
            return res.data ?? null;
        } catch (e: any) {
            if (e?.response?.status === 204 || e?.response?.status === 404) return null;
            throw e;
        }
    },

    async subscribeFree(): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/subscribe/free');
        return res.data;
    },

    async subscribePaid(plan: PlanType, authKey: string): Promise<SubscriptionResponse> {
        const res = await api.post<SubscriptionResponse>('/api/billing/subscribe', {
            plan,
            authKey,
        });
        return res.data;
    },

    async cancel(): Promise<void> {
        await api.delete<void>('/api/billing/cancel');
    },
};

export default subscriptionApi;
