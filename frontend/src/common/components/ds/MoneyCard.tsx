/**
 * MoneyCard — warm 카드 + 라벨 + 큰 금액(numericLg) + 보조설명.
 * 확정 시안 money() 헬퍼와 1:1. 금액 포맷은 formatMoney 사용 권장.
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {radius, spacing, typography} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

interface MoneyCardProps {
    label: string;
    value: string;
    sub?: string;
    /** 금액 색 (기본 브랜드) */
    valueColor?: string;
    style?: StyleProp<ViewStyle>;
}

export const MoneyCard: React.FC<MoneyCardProps> = ({label, value, sub, valueColor, style}) => {
    const c = useThemeColors();
    const resolvedValueColor = valueColor ?? c.brandPrimary;
    return (
        <View style={[styles.card, {backgroundColor: c.surfaceWarm, borderColor: c.brandPrimaryMuted}, style]}>
            <Text style={[styles.label, {color: c.textSecondary}]}>{label}</Text>
            <Text style={[styles.value, {color: resolvedValueColor}]}>{value}</Text>
            {sub ? <Text style={[styles.sub, {color: c.textTertiary}]}>{sub}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    label: {fontSize: 11, fontWeight: '800'},
    value: {
        marginTop: 2,
        fontSize: typography.scale.numericLg.fontSize,
        lineHeight: typography.scale.numericLg.lineHeight,
        fontWeight: '900',
    },
    sub: {marginTop: 4, fontSize: 12, lineHeight: 17},
});

export default MoneyCard;
