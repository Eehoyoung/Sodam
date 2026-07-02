/**
 * PastDueBanner — 구독 상태가 PAST_DUE(결제 실패)일 때 사장 앱 내에 노출하는 인앱 배너.
 *
 * 결제 실패 침묵 이탈 방지(T1-6): 카드 재등록을 유도하는 명확한 행동 경로 제공.
 * OfflineBanner 패턴(상단 슬림, 색+아이콘 글리프+텍스트 병기)을 따르되,
 * 탭 가능한 배너로 카드 재등록(구독) 화면 딥링크를 연결한다.
 */
import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';

interface PastDueBannerProps {
    /** 카드 재등록(구독) 화면으로 이동 */
    onPress: () => void;
}

export const PastDueBanner: React.FC<PastDueBannerProps> = ({onPress}) => {
    const c = useThemeColors();
    return (
        <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="카드 결제에 실패했어요. 카드를 다시 등록해 주세요."
            activeOpacity={0.85}
            onPress={onPress}
            style={[styles.banner, {backgroundColor: c.error}]}>
            <Ionicons name="card-outline" size={18} color={c.textInverse} />
            <View style={styles.textCol}>
                <Text numberOfLines={1} style={[styles.title, {color: c.textInverse}]}>
                    카드 결제에 실패했어요
                </Text>
                <Text numberOfLines={1} style={[styles.sub, {color: c.textInverse}]}>
                    카드를 다시 등록해 주세요
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textInverse} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
    },
    textCol: {flex: 1},
    title: {fontSize: 13, fontWeight: '900'},
    sub: {fontSize: 12, fontWeight: '700', opacity: 0.9, marginTop: 1},
});

export default PastDueBanner;
