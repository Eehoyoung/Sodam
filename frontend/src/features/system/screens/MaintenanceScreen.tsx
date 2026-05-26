import React from 'react';
import {ErrorState, ScreenContainer} from '../../../common/components/ds';

interface Props {
    onRetry: () => void;
    /** 점검 종료 예정 시각 등 추가 안내 */
    note?: string;
}

/**
 * A10 점검(maintenance) 안내 (갭분석 P1).
 * 서버 점검·배포 중 5xx 대신 노출.
 */
const MaintenanceScreen: React.FC<Props> = ({onRetry, note}) => (
    <ScreenContainer edges={['top', 'bottom']}>
        <ErrorState
            glyph="🛠"
            markColor="#243B4A"
            title="잠시 점검 중이에요"
            description={note ?? '더 안정적인 서비스를 위해 점검하고 있어요. 잠시 후 다시 시도해 주세요.'}
            primary={{label: '다시 시도', onPress: onRetry}}
        />
    </ScreenContainer>
);

export default MaintenanceScreen;
