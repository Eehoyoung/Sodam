import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ErrorState, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface Props {
    onRetry: () => void;
    /** 점검 종료 예정 시각 등 추가 안내 */
    note?: string;
}

/**
 * A10 점검(maintenance) 안내 (갭분석 P1).
 * 서버 점검·배포 중 5xx 대신 노출.
 * v3 토스식: 큰 Ionicons 일러스트 + 친근한 한 줄 + 단일 CTA.
 */
const MaintenanceScreen: React.FC<Props> = ({onRetry, note}) => {
    const c = useThemeColors();
    return (
        <ScreenContainer edges={['top', 'bottom']}>
            <ErrorState
                glyph={<Ionicons name="construct-outline" size={40} color={c.textInverse} />}
                markColor={c.brandSecondary}
                title="잠시 점검 중이에요"
                description={note ?? '더 안정적인 서비스를 위해 점검하고 있어요. 잠시 후 다시 시도해 주세요.'}
                primary={{label: '다시 시도', onPress: onRetry}}
            />
        </ScreenContainer>
    );
};

export default MaintenanceScreen;
