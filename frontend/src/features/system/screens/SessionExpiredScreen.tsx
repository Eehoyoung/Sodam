import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ErrorState, ScreenContainer} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface Props {
    onRelogin: () => void;
    onSupport?: () => void;
}

/**
 * A1 세션 만료 안내 + 재로그인 (갭분석 P0).
 * api.ts refresh 실패 → 무음 로그아웃 대신 이 화면으로 안내.
 * v3 토스식: 큰 Ionicons 일러스트 + 친근한 한 줄 + 단일 CTA.
 */
const SessionExpiredScreen: React.FC<Props> = ({onRelogin, onSupport}) => {
    const c = useThemeColors();
    return (
        <ScreenContainer>
            <ErrorState
                glyph={<Ionicons name="lock-closed-outline" size={40} color={c.textInverse} />}
                markColor={c.brandSecondary}
                title="다시 로그인해 주세요"
                description="보안을 위해 일정 시간이 지나면 자동으로 로그아웃돼요. 작성 중이던 내용은 저장돼 있으니 안심하세요."
                primary={{label: '다시 로그인', onPress: onRelogin}}
                secondary={onSupport ? {label: '고객지원 보기', onPress: onSupport} : undefined}
            />
        </ScreenContainer>
    );
};

export default SessionExpiredScreen;
