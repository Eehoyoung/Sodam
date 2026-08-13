import api from '../../../common/api/client';
import type {PaymentReadiness} from './attendanceCreditApi';

/**
 * 채용 부스트 무제한 패스 API 래퍼 — BE `RecruitmentBoostPassController` 1:1(recruitment-
 * monetization-gamification-plan.md §2.5, §7).
 *
 * 사장(User) 단위 3/7/30일 기간제 애드온 — 기존 매장 정기구독(`features/subscription`)과는 완전히
 * 별개 트랙이다(번들링 없음). 결제 흐름은 출근권 충전소(`attendanceCreditApi`)와 동일한 1회성
 * 토스 결제 패턴을 그대로 따른다.
 *
 * 흐름:
 *  1. getMe() 로 현재 활성 상태(active/activeUntil/remainingDays) + 상품 3종 확인
 *  2. createOrder(productCode) → PENDING 주문(orderId/금액) 생성
 *  3. 토스 SDK(one-off `requestPayment`)로 결제 → paymentKey 획득
 *  4. confirmOrder(orderId, paymentKey, amount) → 서버 승인 → 즉시 연장(스택형)
 */

export type RecruitmentBoostPassProductCode = 'THREE_DAY' | 'SEVEN_DAY' | 'THIRTY_DAY';
export type RecruitmentBoostPassOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface RecruitmentBoostPassProduct {
    code: RecruitmentBoostPassProductCode;
    displayName: string;
    durationDays: number;
    priceKrw: number;
}

export interface RecruitmentBoostPassSummary {
    active: boolean;
    activeUntil: string | null;
    remainingDays: number;
    products: RecruitmentBoostPassProduct[];
}

export interface RecruitmentBoostPassOrder {
    id: number;
    orderId: string;
    productCode: RecruitmentBoostPassProductCode;
    orderName: string;
    amountKrw: number;
    durationDays: number;
    status: RecruitmentBoostPassOrderStatus;
    paidAt?: string | null;
}

export const recruitmentBoostPassApi = {
    async getPaymentReadiness(): Promise<PaymentReadiness> {
        const res = await api.get<PaymentReadiness>('/api/recruitment-boost-passes/payment-readiness');
        return res.data;
    },

    async getMe(): Promise<RecruitmentBoostPassSummary> {
        const res = await api.get<RecruitmentBoostPassSummary>('/api/recruitment-boost-passes/me');
        return res.data;
    },

    async createOrder(productCode: RecruitmentBoostPassProductCode): Promise<RecruitmentBoostPassOrder> {
        // api.post 는 (url, data, config) 그대로 전달하므로 params 이중래핑 함정이 없다(api.get 전용 함정).
        const res = await api.post<RecruitmentBoostPassOrder>(
            '/api/recruitment-boost-passes/orders',
            null,
            {params: {productCode}},
        );
        return res.data;
    },

    async confirmOrder(orderId: string, paymentKey: string, amount: number): Promise<RecruitmentBoostPassOrder> {
        const res = await api.post<RecruitmentBoostPassOrder>(
            `/api/recruitment-boost-passes/orders/${encodeURIComponent(orderId)}/confirm`,
            {paymentKey, amount},
        );
        return res.data;
    },

    async myOrders(): Promise<RecruitmentBoostPassOrder[]> {
        const res = await api.get<RecruitmentBoostPassOrder[]>('/api/recruitment-boost-passes/orders/me');
        return res.data;
    },
};

export default recruitmentBoostPassApi;
