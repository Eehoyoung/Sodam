import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BottomSheet} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface Props {
    visible: boolean;
    onAllow: () => void;
    onLater: () => void;
}

/**
 * A8 푸시 알림 수신 동의 프라이머 (갭분석 P1).
 * OS 권한 팝업 전에 가치를 설명해 동의율을 높인다.
 * 핸들 아래 원형 벨 아이콘 추가 — 아티팩트 O8 sheet__icon(🔔) 대조 반영
 * (docs/260720/artifacts/sodam-v3-13-ops.html).
 */
const PushPrimerSheet: React.FC<Props> = ({visible, onAllow, onLater}) => {
    const c = useThemeColors();
    return (
        <BottomSheet
            visible={visible}
            onClose={onLater}
            icon={<Ionicons name="notifications" size={22} color={c.brandPrimary} />}
            title="중요한 알림만 보내드릴게요"
            description="직원 미출근, 정정 요청, 급여명세 발급 같은 꼭 필요한 소식만 알려드려요."
            primary={{label: '알림 받기', onPress: onAllow}}
            secondary={{label: '나중에', variant: 'ghost', onPress: onLater}}
        />
    );
};

export default PushPrimerSheet;
