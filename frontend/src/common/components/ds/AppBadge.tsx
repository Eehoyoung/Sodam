/**
 * AppBadge — 상태 배지.
 *
 * (08-micro-design-final-spec.md §6)
 *   success(정상/완료/승인) · warning(알림/미출근/대기) · error(누락/실패/반려) · info(보기/설정/준비중)
 * 규칙: 텍스트 2~4자 권장 · 색만으로 의미 전달 금지(항상 텍스트 동반) · 리스트 우측 배치.
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface AppBadgeProps {
    label: string;
    tone?: BadgeTone;
    style?: StyleProp<ViewStyle>;
}

export const AppBadge: React.FC<AppBadgeProps> = ({label, tone = 'success', style}) => {
    const c = useThemeColors();
    // warning fg 는 라이트에서 어두운 amber(#B56D00)로 고대비 보장 — 다크에서는 토큰 warning 자체 사용
    const tones: Record<BadgeTone, {bg: string; fg: string}> = {
        success: {bg: c.successBg, fg: c.success},
        warning: {bg: c.warningBg, fg: c.warning === '#F59E0B' ? '#B56D00' : c.warning},
        error: {bg: c.errorBg, fg: c.error},
        info: {bg: c.infoBg, fg: c.info},
        neutral: {bg: c.surfaceMuted, fg: c.textSecondary},
    };
    const t = tones[tone];
    return (
        <View
            accessible
            accessibilityLabel={label}
            style={[styles.badge, {backgroundColor: t.bg}, style]}>
            <Text numberOfLines={1} style={[styles.text, {color: t.fg}]}>
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        minHeight: 27,
        paddingHorizontal: spacing.sm + 1,
        paddingVertical: 6,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
    text: {fontSize: 11, fontWeight: '800'},
});

export default AppBadge;
