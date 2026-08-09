import api from '../../../common/api/client';

export type TaxPackageType =
    | 'INCOME_TAX_FILING'
    | 'INCOME_TAX_PREMIUM'
    | 'BOOKKEEPING_MONTHLY';

export type TaxServiceOrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type TaxPaymentMode = 'MOCK' | 'LIVE' | 'UNAVAILABLE';

export interface TaxPaymentReadiness {
    mode: TaxPaymentMode;
    successUrl?: string | null;
    failUrl?: string | null;
}

export interface TaxServicePackage {
    name: TaxPackageType;
    displayName: string;
    amount: number;
}

export interface TaxServiceOrder {
    id: number;
    orderId: string;
    packageType: TaxPackageType;
    orderName: string;
    amount: number;
    status: TaxServiceOrderStatus;
    paidAt: string | null;
}

/** 현재 mock 결제 환경의 세무 전문가 연결 단건 주문 API. */
export const taxServiceOrderApi = {
    async getPaymentReadiness(): Promise<TaxPaymentReadiness> {
        const {data} = await api.get<TaxPaymentReadiness>('/api/billing/tax-orders/payment-readiness');
        return data;
    },

    async getPackages(): Promise<TaxServicePackage[]> {
        const {data} = await api.get<TaxServicePackage[]>('/api/billing/tax-orders/packages');
        return data;
    },

    async createOrder(packageType: TaxPackageType): Promise<TaxServiceOrder> {
        const {data} = await api.post<TaxServiceOrder>(
            '/api/billing/tax-orders',
            null,
            {params: {packageType}},
        );
        return data;
    },

    async confirmOrder(orderId: string, paymentKey: string, amount: number): Promise<TaxServiceOrder> {
        const {data} = await api.post<TaxServiceOrder>(
            `/api/billing/tax-orders/${encodeURIComponent(orderId)}/confirm`,
            {paymentKey, amount},
        );
        return data;
    },

    async getMyOrders(): Promise<TaxServiceOrder[]> {
        const {data} = await api.get<TaxServiceOrder[]>('/api/billing/tax-orders/me');
        return data;
    },
};

export default taxServiceOrderApi;
