/**
 * 구독 관련 타입 정의
 */

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: number;
    billingCycle: 'MONTHLY' | 'YEARLY';
    features: string[];
    isPopular?: boolean;
}

export interface SubscriptionStatus {
    planId: string;
    planName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    autoRenew: boolean;
    nextBillingDate?: string;
}

export interface PaymentMethod {
    id: string;
    type: 'CREDIT_CARD' | 'BANK_TRANSFER';
    lastFourDigits?: string;
    expiryDate?: string;
    isDefault: boolean;
}

export interface PaymentHistory {
    id: string;
    planId: string;
    planName: string;
    amount: number;
    date: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    paymentMethodId: string;
    invoiceUrl?: string;
}

export interface SubscriptionRequest {
    planId: string;
    paymentMethodId: string;
    autoRenew: boolean;
}
