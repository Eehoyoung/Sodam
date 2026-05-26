/**
 * MoneyCard — warm 카드 + 라벨 + 큰 금액(numericLg) + 보조설명.
 * 확정 시안 money() 헬퍼와 1:1. 금액 포맷은 formatMoney 사용 권장.
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {colors, radius, spacing, typography} from '../../../theme/tokens';

interface MoneyCardProps {
    label: string;
    value: string;
    sub?: string;
    /** 금액 색 (기본 브랜드) */
    valueColor?: string;
    style?: StyleProp<ViewStyle>;
}

export const MoneyCard: React.FC<MoneyCardProps> = ({label, value, sub, valueColor = colors.brandPrimary, style}) => (
    <View style={[styles.card, style]}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, {color: valueColor}]}>{value}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surfaceWarm,
        borderWidth: 1,
        borderColor: colors.brandPrimaryMuted,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    label: {fontSize: 11, fontWeight: '800', color: colors.textSecondary},
    value: {
        marginTop: 2,
        fontSize: typography.scale.numericLg.fontSize,
        lineHeight: typography.scale.numericLg.lineHeight,
        fontWeight: '900',
    },
    sub: {marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.textTertiary},
});

export default MoneyCard;
