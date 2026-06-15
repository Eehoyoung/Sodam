import React, {useEffect, useState} from 'react';
import {setOnPlanRequired, PlanRequiredInfo} from '../../../common/utils/api';
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

const PaywallHost: React.FC = () => {
    const [info, setInfo] = useState<PlanRequiredInfo | null>(null);

    useEffect(() => {
        setOnPlanRequired((next: PlanRequiredInfo) => setInfo(next));
        return () => setOnPlanRequired(null);
    }, []);

    const requiredLabel = info?.requiredPlan
        ? (PLAN_LABELS[info.requiredPlan] ?? info.requiredPlan)
        : '상위';

    return (
        <PaywallSheet
            visible={info !== null}
            requiredPlanLabel={requiredLabel}
            message={info?.message ?? ''}
            onUpgrade={() => {
                setInfo(null);
                navigate('Subscribe');
            }}
            onClose={() => setInfo(null)}
        />
    );
};

export default PaywallHost;
