/**
 * OfflineBanner — 상단 슬림 오프라인/동기화 배너 (갭분석 A2).
 *
 * 기존 Toast 와 구분: 상단 고정·지속성. 오프라인 동안 계속 노출.
 * 색만으로 의미 전달 금지 — 아이콘 글리프 + 텍스트 병기.
 * App 루트(네비게이터 상단)에 마운트해 useOfflineSync 상태와 연결한다.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, spacing} from '../../../theme/tokens';

export type SyncState = 'offline' | 'syncing' | 'hidden';

interface OfflineBannerProps {
    state: SyncState;
    /** 대기 중인 오프라인 기록 수 (있으면 표기) */
    pendingCount?: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({state, pendingCount}) => {
    const insets = useSafeAreaInsets();
    if (state === 'hidden') {
        return null;
    }
    const offline = state === 'offline';
    return (
        <View
            accessibilityRole="alert"
            style={[
                styles.banner,
                {paddingTop: insets.top + spacing.xs, backgroundColor: offline ? colors.brandSecondary : colors.success},
            ]}>
            <Text style={styles.glyph}>{offline ? '⚡' : '↻'}</Text>
            <Text numberOfLines={1} style={styles.text}>
                {offline
                    ? `지금 오프라인이에요. 기록은 안전하게 보관 중이에요.${pendingCount ? ` (대기 ${pendingCount}건)` : ''}`
                    : '다시 연결됐어요. 대기 중이던 기록을 처리하고 있어요.'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    glyph: {color: colors.textInverse, fontSize: 13, fontWeight: '900'},
    text: {flex: 1, color: colors.textInverse, fontSize: 12, fontWeight: '800'},
});

export default OfflineBanner;
