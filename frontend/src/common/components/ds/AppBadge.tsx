/**
 * AppBadge — 상태 배지.
 *
 * (08-micro-design-final-spec.md §6)
 *   success(정상/완료/승인) · warning(알림/미출근/대기) · error(누락/실패/반려) · info(보기/설정/준비중)
 * 규칙: 텍스트 2~4자 권장 · 색만으로 의미 전달 금지(항상 텍스트 동반) · 리스트 우측 배치.
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../../../theme/tokens';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface AppBadgeProps {
    label: string;
    tone?: BadgeTone;
    style?: StyleProp<ViewStyle>;
}

const TONES: Record<BadgeTone, {bg: string; fg: string}> = {
    success: {bg: colors.successBg, fg: colors.success},
    warning: {bg: colors.warningBg, fg: '#B56D00'},
    error: {bg: colors.errorBg, fg: colors.error},
    info: {bg: colors.infoBg, fg: colors.info},
    neutral: {bg: colors.surfaceMuted, fg: colors.textSecondary},
};

export const AppBadge: React.FC<AppBadgeProps> = ({label, tone = 'success', style}) => {
    const c = TONES[tone];
    return (
        <View
            accessible
            accessibilityLabel={label}
            style={[styles.badge, {backgroundColor: c.bg}, style]}>
            <Text numberOfLines={1} style={[styles.text, {color: c.fg}]}>
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
