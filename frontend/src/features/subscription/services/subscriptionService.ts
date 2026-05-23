import api from '../../../common/utils/api';
import {SubscriptionPlan, SubscriptionStatus, PaymentMethod, PaymentHistory, SubscriptionRequest} from '../types';

/**
 * 구독 관련 서비스
 * 구독 플랜 및 결제 관리 기능을 제공합니다.
 */

// 구독 서비스 객체
const subscriptionService = {
    /**
     * 모든 구독 플랜 조회
     * @returns 구독 플랜 목록
     */
    getAllPlans: async (): Promise<SubscriptionPlan[]> => {
        try {
            const response = await api.get<SubscriptionPlan[]>('/subscription/plans');
            return response.data;
        } catch (error) {
            console.error('구독 플랜 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 특정 구독 플랜 상세 조회
     * @param planId 플랜 ID
     * @returns 구독 플랜 상세
     */
    getPlanById: async (planId: string): Promise<SubscriptionPlan> => {
        try {
            const response = await api.get<SubscriptionPlan>(`/subscription/plans/${planId}`);
            return response.data;
        } catch (error) {
            console.error('구독 플랜 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 현재 사용자의 구독 상태 조회
     * @returns 구독 상태
     */
    getCurrentSubscription: async (): Promise<SubscriptionStatus> => {
        try {
            const response = await api.get<SubscriptionStatus>('/subscription/status');
            return response.data;
        } catch (error) {
            console.error('현재 구독 상태를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 구독 신청
     * @param subscriptionRequest 구독 신청 데이터
     * @returns 구독 상태
     */
    subscribe: async (subscriptionRequest: SubscriptionRequest): Promise<SubscriptionStatus> => {
        try {
            const response = await api.post<SubscriptionStatus>('/subscription/subscribe', subscriptionRequest);
            return response.data;
        } catch (error) {
            console.error('구독 신청 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 구독 취소
     * @returns 취소된 구독 상태
     */
    cancelSubscription: async (): Promise<SubscriptionStatus> => {
        try {
            const response = await api.post<SubscriptionStatus>('/subscription/cancel');
            return response.data;
        } catch (error) {
            console.error('구독 취소 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 구독 갱신 설정 변경
     * @param autoRenew 자동 갱신 여부
     * @returns 업데이트된 구독 상태
     */
    updateAutoRenew: async (autoRenew: boolean): Promise<SubscriptionStatus> => {
        try {
            const response = await api.put<SubscriptionStatus>('/subscription/auto-renew', {autoRenew});
            return response.data;
        } catch (error) {
            console.error('자동 갱신 설정 변경 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 구독 플랜 변경
     * @param planId 새 플랜 ID
     * @returns 업데이트된 구독 상태
     */
    changePlan: async (planId: string): Promise<SubscriptionStatus> => {
        try {
            const response = await api.put<SubscriptionStatus>('/subscription/change-plan', {planId});
            return response.data;
        } catch (error) {
            console.error('구독 플랜 변경 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 결제 수단 목록 조회
     * @returns 결제 수단 목록
     */
    getPaymentMethods: async (): Promise<PaymentMethod[]> => {
        try {
            const response = await api.get<PaymentMethod[]>('/subscription/payment-methods');
            return response.data;
        } catch (error) {
            console.error('결제 수단 목록을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 결제 수단 추가
     * @param paymentMethod 결제 수단 데이터
     * @returns 추가된 결제 수단
     */
    addPaymentMethod: async (paymentMethod: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> => {
        try {
            const response = await api.post<PaymentMethod>('/subscription/payment-methods', paymentMethod);
            return response.data;
        } catch (error) {
            console.error('결제 수단 추가 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 결제 수단 삭제
     * @param paymentMethodId 결제 수단 ID
     */
    deletePaymentMethod: async (paymentMethodId: string): Promise<void> => {
        try {
            await api.delete(`/subscription/payment-methods/${paymentMethodId}`);
        } catch (error) {
            console.error('결제 수단 삭제 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 기본 결제 수단 설정
     * @param paymentMethodId 결제 수단 ID
     * @returns 업데이트된 결제 수단 목록
     */
    setDefaultPaymentMethod: async (paymentMethodId: string): Promise<PaymentMethod[]> => {
        try {
            const response = await api.put<PaymentMethod[]>(`/subscription/payment-methods/${paymentMethodId}/default`);
            return response.data;
        } catch (error) {
            console.error('기본 결제 수단 설정 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 결제 내역 조회
     * @param page 페이지 번호
     * @param limit 페이지당 항목 수
     * @returns 결제 내역 목록
     */
    getPaymentHistory: async (page: number = 1, limit: number = 10): Promise<PaymentHistory[]> => {
        try {
            const response = await api.get<PaymentHistory[]>('/subscription/payment-history', {page, limit});
            return response.data;
        } catch (error) {
            console.error('결제 내역을 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 특정 결제 내역 상세 조회
     * @param paymentId 결제 ID
     * @returns 결제 내역 상세
     */
    getPaymentById: async (paymentId: string): Promise<PaymentHistory> => {
        try {
            const response = await api.get<PaymentHistory>(`/subscription/payment-history/${paymentId}`);
            return response.data;
        } catch (error) {
            console.error('결제 내역 상세를 가져오는 중 오류가 발생했습니다:', error);
            throw error;
        }
    },

    /**
     * 영수증 다운로드
     * @param paymentId 결제 ID
     * @returns 영수증 URL
     */
    downloadReceipt: async (paymentId: string): Promise<string> => {
        try {
            const response = await api.get<{ url: string }>(`/subscription/payment-history/${paymentId}/receipt`);
            return response.data.url;
        } catch (error) {
            console.error('영수증 다운로드 중 오류가 발생했습니다:', error);
            throw error;
        }
    },
};

export default subscriptionService;
