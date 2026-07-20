import React, {useEffect, useState} from 'react';
import {setOnPlanRequired, PlanRequiredInfo} from '../../../common/api';
import {navigate} from '../../../navigation/navigationRef';
import PaywallSheet from './PaywallSheet';

/**
 * 전역 페이월 호스트. BE가 402(PLAN_REQUIRED)를 반환하면 api 인터셉터가 setOnPlanRequired 콜백을
 * 호출하고, 여기서 디자이너의 {@link PaywallSheet}를 띄운다. 업그레이드 시 구독 화면으로 이동.
 *
 * 401(setOnUnauthorized)과 동일하게 앱 루트(AuthProvider)에 1회 마운트한다.
 */
const PLAN_LABELS: Record<string, string> = {
    FREE: '무료',
    STARTER: '스타터',
    PRO: '프로',
    PREMIUM: '프리미엄',
};

/**
 * GR-NEW-07 맥락형 페이월. BE 402 message 에 멀티매장 관련 키워드가 있으면
 * 일반 잠금 안내 대신 "두 번째 매장" 맥락으로 카피를 바꾼다(최소 침습, 메시지 기반 분기).
 */
const MULTI_STORE_KEYWORDS = ['매장', '두 번째', '둘째', '추가 매장', '멀티'];

const isMultiStoreContext = (message?: string): boolean =>
    !!message && MULTI_STORE_KEYWORDS.some(k => message.includes(k));

const PaywallHost: React.FC = () => {
    const [info, setInfo] = useState<PlanRequiredInfo | null>(null);

    useEffect(() => {
        setOnPlanRequired((next: PlanRequiredInfo) => setInfo(next));
        return () => setOnPlanRequired(null);
    }, []);

    const requiredLabel = info?.requiredPlan
        ? (PLAN_LABELS[info.requiredPlan] ?? info.requiredPlan)
        : '상위';

    // 멀티매장 맥락이면서 프로 플랜이 필요할 때만 맥락형 카피로 전환.
    const multiStore = info?.requiredPlan === 'PRO' && isMultiStoreContext(info?.message);
    const contextTitle = multiStore ? '두 번째 매장을 열어볼까요?' : undefined;
    const contextMessage = multiStore
        ? '두 번째 매장은 프로 플랜에서 관리할 수 있어요. 매장별 직원·급여를 따로 관리해 보세요.'
        : (info?.message ?? '');
    const contextHighlight = multiStore
        ? '프로 플랜이면 매장을 여러 곳 운영해도 직원·출퇴근·급여를 한곳에서 관리할 수 있어요.'
        : undefined;

    return (
        <PaywallSheet
            visible={info !== null}
            requiredPlanLabel={requiredLabel}
            title={contextTitle}
            message={contextMessage}
            highlight={contextHighlight}
            onUpgrade={() => {
                setInfo(null);
                navigate('Subscribe');
            }}
            onClose={() => setInfo(null)}
        />
    );
};

export default PaywallHost;
