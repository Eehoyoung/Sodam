import React from 'react';
import {BottomSheet} from '../../../common/components/ds';

interface Props {
    visible: boolean;
    onAllow: () => void;
    onLater: () => void;
}

/**
 * A8 푸시 알림 수신 동의 프라이머 (갭분석 P1).
 * OS 권한 팝업 전에 가치를 설명해 동의율을 높인다.
 */
const PushPrimerSheet: React.FC<Props> = ({visible, onAllow, onLater}) => (
    <BottomSheet
        visible={visible}
        onClose={onLater}
        title="중요한 알림만 보내드릴게요"
        description="직원 미출근, 정정 요청, 급여명세 발급 같은 꼭 필요한 소식만 알려드려요."
        primary={{label: '알림 받기', onPress: onAllow}}
        secondary={{label: '나중에', variant: 'ghost', onPress: onLater}}
    />
);

export default PushPrimerSheet;
