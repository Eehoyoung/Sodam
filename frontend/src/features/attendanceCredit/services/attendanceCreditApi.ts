import api from '../../../common/api/client';

/**
 * 출근권 충전소(IAP) API 래퍼 — BE `AttendanceCreditChargeController` 1:1(recruitment-
 * monetization-gamification-plan.md §2.4, §7).
 *
 * 흐름:
 *  1. getChargeCatalog() 로 상품 목록 + 첫구매 보너스 가용 여부 확인
 *  2. createChargeOrder(packCode) → PENDING 주문(orderId/금액) 생성
 *  3. 토스 SDK(one-off `requestPayment`)로 결제 → paymentKey 획득
 *  4. confirmCharge(orderId, paymentKey, amount) → 서버 승인 → 출근권 즉시 지급
 *
 * 잔액/이번 주 소멸 예정/스트릭 요약(`GET /api/attendance-credits/me`)은 이미
 * `features/recruitment/services/attendanceCreditService.ts`(Phase A/B)가 소유한다 — 여기서
 * 다시 만들지 않고 그대로 재사용한다(타입 드리프트 방지 — BE 응답 필드는 `dayOfWeek` 이지 `label`
 * 이 아니다. `features/recruitment/types.ts`의 `AttendanceCreditSummary`가 단일 진실 공급원).
 */

export type AttendanceCreditChargePackCode = 'SMALL' | 'MEDIUM' | 'LARGE' | 'STREAK_RECOVERY';
export type AttendanceCreditChargeOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface AttendanceCreditChargePack {
    code: AttendanceCreditChargePackCode;
    displayName: string;
    creditQuantity: number;
    ticketQuantity: number;
    priceKrw: number;
    popular: boolean;
}

export interface AttendanceCreditChargeCatalog {
    packs: AttendanceCreditChargePack[];
    firstPurchaseBonusAvailable: boolean;
    firstPurchaseBonusMultiplier: number;
    /** "웰컴 2배" 등 프로모션 문구를 FE 에 노출해도 되는지(§8 법무 검토 전 기본 false). */
    promoCopyEnabled: boolean;
}

export interface AttendanceCreditChargeOrder {
    id: number;
    orderId: string;
    packCode: AttendanceCreditChargePackCode;
    orderName: string;
    amountKrw: number;
    creditQuantity: number;
    bonusCreditQuantity: number;
    ticketQuantity: number;
    status: AttendanceCreditChargeOrderStatus;
    paidAt?: string | null;
}

export const attendanceCreditApi = {
    async getChargeCatalog(): Promise<AttendanceCreditChargeCatalog> {
        const res = await api.get<AttendanceCreditChargeCatalog>('/api/attendance-credits/charge/packs');
        return res.data;
    },

    async createChargeOrder(packCode: AttendanceCreditChargePackCode): Promise<AttendanceCreditChargeOrder> {
        // api.post 는 (url, data, config) 그대로 전달하므로 params 이중래핑 함정이 없다(api.get 전용 함정).
        const res = await api.post<AttendanceCreditChargeOrder>(
            '/api/attendance-credits/charge/orders',
            null,
            {params: {packCode}},
        );
        return res.data;
    },

    async confirmCharge(orderId: string, paymentKey: string, amount: number): Promise<AttendanceCreditChargeOrder> {
        const res = await api.post<AttendanceCreditChargeOrder>(
            `/api/attendance-credits/charge/orders/${encodeURIComponent(orderId)}/confirm`,
            {paymentKey, amount},
        );
        return res.data;
    },

    async myChargeOrders(): Promise<AttendanceCreditChargeOrder[]> {
        const res = await api.get<AttendanceCreditChargeOrder[]>('/api/attendance-credits/charge/orders/me');
        return res.data;
    },
};

export default attendanceCreditApi;
