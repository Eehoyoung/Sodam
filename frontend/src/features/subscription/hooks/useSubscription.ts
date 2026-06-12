/**
 * useSubscription — 구독 플랜·현재 구독 상태 로딩 + 액션(무료가입/일시정지/재개).
 *
 * 화면은 이 훅 하나로 카탈로그·현재 상태·로딩·에러를 받고,
 * 무료 가입 / 일시정지 / 재개 액션을 호출한다. (결제 활성화는 별도 승인 게이트)
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import subscriptionApi, {
    PlanCatalogItem,
    SubscriptionResponse,
} from '../services/subscriptionApi';

export interface UseSubscriptionResult {
    plans: PlanCatalogItem[];
    current: SubscriptionResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    subscribeFree: () => Promise<SubscriptionResponse>;
    pause: () => Promise<SubscriptionResponse>;
    resume: () => Promise<SubscriptionResponse>;
}

function toMessage(e: unknown, fallback: string): string {
    const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
    return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export function useSubscription(): UseSubscriptionResult {
    const [plans, setPlans] = useState<PlanCatalogItem[]>([]);
    const [current, setCurrent] = useState<SubscriptionResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // 언마운트 후 setState 방지
    const mountedRef = useRef<boolean>(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const refresh = useCallback(async (): Promise<void> => {
        if (mountedRef.current) {
            setLoading(true);
            setError(null);
        }
        try {
            const [planList, mine] = await Promise.all([
                subscriptionApi.getPlans(),
                subscriptionApi.getMyCurrent(),
            ]);
            if (!mountedRef.current) {
                return;
            }
            setPlans(Array.isArray(planList) ? planList : []);
            setCurrent(mine ?? null);
        } catch (e: unknown) {
            if (mountedRef.current) {
                setError(toMessage(e, '구독 정보를 불러오지 못했어요.'));
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const subscribeFree = useCallback(async (): Promise<SubscriptionResponse> => {
        const res = await subscriptionApi.subscribeFree();
        if (mountedRef.current) {
            setCurrent(res);
        }
        return res;
    }, []);

    const pause = useCallback(async (): Promise<SubscriptionResponse> => {
        const res = await subscriptionApi.pause();
        if (mountedRef.current) {
            setCurrent(res);
        }
        return res;
    }, []);

    const resume = useCallback(async (): Promise<SubscriptionResponse> => {
        const res = await subscriptionApi.resume();
        if (mountedRef.current) {
            setCurrent(res);
        }
        return res;
    }, []);

    return {plans, current, loading, error, refresh, subscribeFree, pause, resume};
}

export default useSubscription;
