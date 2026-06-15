import React from 'react';
import {ScreenContainer, SuccessState} from '../../../common/components/ds';

interface Props {
    onDone: () => void;
    /** 복구/결제된 플랜명 */
    planName?: string;
}

/**
 * A11 재결제 성공 / 결제 복구 (갭분석 추가).
 * ⚠️ 표현만 — 결제 트리거·금액 로직 불변.
 */
const PaymentSuccessScreen: React.FC<Props> = ({onDone, planName = '비즈니스'}) => (
    <ScreenContainer edges={['top', 'bottom']}>
        <SuccessState
            title="결제가 완료됐어요"
            description={`${planName} 플랜이 다시 활성화됐어요. 멈췄던 기능을 바로 쓸 수 있어요.`}
            primary={{label: '계속하기', onPress: onDone}}
        />
    </ScreenContainer>
);

export default PaymentSuccessScreen;
