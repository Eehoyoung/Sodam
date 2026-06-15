/**
 * HeroNumber — v3 토스식 "숫자가 히어로" 상단 블록.
 *
 * 작은 라벨 + 거대 숫자(40~56, weight 800) + 보조 한 줄.
 * 화면 진입 시 핵심 수치(이번 달 급여·인건비 등)를 한눈에.
 *
 * props: { label, value, sub?, accent? }
 *   - accent: 숫자 색을 브랜드 오렌지로 강조(기본 false → textPrimary).
 *     (카운트업 모션은 호출부에서 value 를 갱신해 구현; 본 컴포넌트는 정적/단순.)
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';
import {useResponsive} from '../../hooks/useResponsive';

interface HeroNumberProps {
    label: string;
    value: string;
    sub?: string;
    /** 숫자를 브랜드 오렌지로 강조 (기본 false: textPrimary) */
    accent?: boolean;
    /** 가운데 정렬 (기본 false: 좌측 정렬) */
    center?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

export const HeroNumber: React.FC<HeroNumberProps> = ({
    label,
    value,
    sub,
    accent = false,
    center = false,
    style,
    testID,
}) => {
    const c = useThemeColors();
    const r = useResponsive();
    // compact 기기에서 40, 그 외 48 (잘림 방지는 adjustsFontSizeToFit 로 추가 보장)
    const valueSize = r.pick({compact: 40, normal: 48, default: 48});

    return (
        <View testID={testID} style={[center ? styles.centered : null, style]}>
            <Text style={[styles.label, {color: c.textSecondary}]} numberOfLines={1}>
                {label}
            </Text>
            <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={[
                    styles.value,
                    {
                        fontSize: valueSize,
                        lineHeight: Math.round(valueSize * 1.1),
                        color: accent ? c.brandPrimary : c.textPrimary,
                    },
                    center ? styles.centerText : null,
                ]}>
                {value}
            </Text>
            {sub ? (
                <Text
                    numberOfLines={1}
                    style={[styles.sub, {color: c.textTertiary}, center ? styles.centerText : null]}>
                    {sub}
                </Text>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    centered: {alignItems: 'center'},
    centerText: {textAlign: 'center'},
    label: {fontSize: 14, fontWeight: '700', letterSpacing: -0.2},
    value: {marginTop: spacing.xs, fontWeight: '800', letterSpacing: -1},
    sub: {marginTop: spacing.xs, fontSize: 14, fontWeight: '500'},
});

export default HeroNumber;
