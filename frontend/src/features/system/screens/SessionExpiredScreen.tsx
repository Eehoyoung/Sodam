import React from 'react';
import {ErrorState, ScreenContainer} from '../../../common/components/ds';

interface Props {
    onRelogin: () => void;
    onSupport?: () => void;
}

/**
 * A1 세션 만료 안내 + 재로그인 (갭분석 P0).
 * api.ts refresh 실패 → 무음 로그아웃 대신 이 화면으로 안내.
 */
const SessionExpiredScreen: React.FC<Props> = ({onRelogin, onSupport}) => (
    <ScreenContainer>
        <ErrorState
            glyph="🔒"
            title="다시 로그인해 주세요"
            description="보안을 위해 일정 시간이 지나면 자동으로 로그아웃돼요. 작성 중이던 내용은 저장돼 있으니 안심하세요."
            primary={{label: '다시 로그인', onPress: onRelogin}}
            secondary={onSupport ? {label: '고객지원 보기', onPress: onSupport} : undefined}
        />
    </ScreenContainer>
);

export default SessionExpiredScreen;
