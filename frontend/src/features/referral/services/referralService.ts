import api from '../../../common/utils/api';

export interface MyCode {
    referralCode: string;
    shareText: string;
}

export interface ReferralItem {
    id: number;
    refereeName: string;
    status: 'REGISTERED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
    registeredAt: string;
    convertedAt?: string;
}

export interface MyRewards {
    convertedCount: number;
    freeMonthsEarned: number;
}

const referralService = {
    // [API Mapping] GET /api/referrals/my-code — 내 추천 코드
    getMyCode: async (): Promise<MyCode | null> => {
        try {
            const res = await api.get<MyCode>('/api/referrals/my-code');
            return res.data ?? null;
        } catch (_) {
            return null;
        }
    },

    // [API Mapping] GET /api/referrals/my-rewards — 적립 보상 요약
    getMyRewards: async (): Promise<MyRewards | null> => {
        try {
            const res = await api.get<MyRewards>('/api/referrals/my-rewards');
            return res.data ?? null;
        } catch (_) {
            return null;
        }
    },

    // [API Mapping] GET /api/referrals/my-history — 추천 적용 이력
    getMyHistory: async (): Promise<ReferralItem[]> => {
        try {
            const res = await api.get<ReferralItem[]>('/api/referrals/my-history');
            return res.data ?? [];
        } catch (_) {
            return [];
        }
    },
};

export default referralService;
