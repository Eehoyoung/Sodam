import React from 'react';
import {Linking} from 'react-native';
import {ScreenContainer, SuccessState} from '../../../common/components/ds';

interface Props {
    /** 스토어 URL (없으면 기본 안내만) */
    storeUrl?: string;
    currentVersion?: string;
}

/**
 * A9 앱 강제 업데이트 (갭분석 P1).
 * 전체화면·우회 불가 — 닫기 버튼 없음. BE 호환이 깨지는 구버전 차단용.
 */
const AppUpdateScreen: React.FC<Props> = ({storeUrl, currentVersion}) => (
    <ScreenContainer edges={['top', 'bottom']}>
        <SuccessState
            glyph="⬆"
            markColor="#FF6B35"
            title="새 버전으로 업데이트해 주세요"
            description={`안정적인 사용을 위해 최신 버전이 필요해요. 잠깐이면 끝나요.${currentVersion ? `\n현재 버전 ${currentVersion}` : ''}`}
            primary={{label: '업데이트하기', onPress: () => storeUrl && Linking.openURL(storeUrl)}}
        />
    </ScreenContainer>
);

export default AppUpdateScreen;
