/**
 * PaywallSheet — 잠긴 기능 안내 바텀 시트 (프레젠테이셔널).
 *
 * 상위 플랜에서만 쓸 수 있는 기능 접근 시 노출. 사장님 존댓말 카피로
 * 필요한 플랜을 안내하고, 업그레이드(primary) / 닫기(secondary) 를 제공한다.
 * 시트 프리미티브는 공통 DS 의 BottomSheet 를 그대로 재사용한다.
 *
 * 순수 컴포넌트: 콜백만 받고 API·네비게이션은 호출 측이 담당.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

export interface PaywallSheetProps {
    visible: boolean;
    /** 필요한 플랜 한글 라벨, 예: "프로" */
    requiredPlanLabel: string;
    /** 서버가 내려준 사유 메시지 */
    message: string;
    /** 맥락형 제목 override (예: 멀티매장). 없으면 기본 제목 사용 */
    title?: string;
    /** 시트 본문에 추가로 노출할 혜택 강조 한 줄 (선택) */
    highlight?: string;
    onUpgrade: () => void;
    onClose: () => void;
}

export const PaywallSheet: React.FC<PaywallSheetProps> = ({
    visible,
    requiredPlanLabel,
    message,
    title,
    highlight,
    onUpgrade,
    onClose,
}) => {
    const c = useThemeColors();

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={title ?? '잠깐, 이 기능은 잠겨 있어요'}
            description={`이 기능은 ${requiredPlanLabel} 플랜에서 이용할 수 있어요.`}
            primary={{label: `${requiredPlanLabel} 플랜으로 업그레이드`, onPress: onUpgrade}}
            secondary={{label: '닫기', variant: 'ghost', onPress: onClose}}>
            <View style={[styles.box, {backgroundColor: c.surfaceWarm, borderColor: c.brandPrimaryMuted}]}>
                <AppText style={styles.lock}>🔒</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.flex}>
                    {message}
                </AppText>
            </View>
            {highlight ? (
                <AppText variant="caption" tone="brand" weight="700" style={styles.highlight}>
                    {highlight}
                </AppText>
            ) : null}
            <AppText variant="caption" tone="tertiary" style={styles.hint}>
                업그레이드하면 바로 이용할 수 있어요. 언제든 변경·해지할 수 있어요.
            </AppText>
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    box: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.md,
        marginTop: spacing.xs,
    },
    lock: {fontSize: 18, lineHeight: 24},
    flex: {flex: 1},
    highlight: {marginTop: spacing.sm},
    hint: {marginTop: spacing.sm},
});

export default PaywallSheet;
