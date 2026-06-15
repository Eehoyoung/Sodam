/**
 * AppText — 타이포 스케일 적용 텍스트.
 * variant 는 05-design-system.md 타이포 표(typography.scale)와 1:1.
 * tone 으로 색을 고른다 (다크 카드 위에서는 tone="inverse").
 */
import React from 'react';
import {StyleProp, Text, TextProps, TextStyle} from 'react-native';
import {typography} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

type Variant = keyof typeof typography.scale;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'inverse' | 'success' | 'error' | 'warning';

interface AppTextProps extends TextProps {
    variant?: Variant;
    tone?: Tone;
    weight?: TextStyle['fontWeight'];
    center?: boolean;
    style?: StyleProp<TextStyle>;
}

export const AppText: React.FC<AppTextProps> = ({
    variant = 'bodyMd',
    tone = 'primary',
    weight,
    center,
    style,
    children,
    ...rest
}) => {
    const c = useThemeColors();
    const s = typography.scale[variant];
    const toneColors: Record<Tone, string> = {
        primary: c.textPrimary,
        secondary: c.textSecondary,
        tertiary: c.textTertiary,
        brand: c.brandPrimary,
        inverse: c.textInverse,
        success: c.success,
        error: c.error,
        warning: c.warning,
    };
    return (
        <Text
            style={[
                {
                    fontSize: s.fontSize,
                    lineHeight: s.lineHeight,
                    fontWeight: weight ?? s.fontWeight,
                    color: toneColors[tone],
                },
                center ? {textAlign: 'center'} : null,
                style,
            ]}
            {...rest}>
            {children}
        </Text>
    );
};

/**
 * AmountText — 금액 전용 텍스트 (v3 토스식 "숫자가 히어로").
 *   - 큰 사이즈(기본 32, size prop 으로 28~52 조절) · weight 800 · letterSpacing -1
 *   - numberOfLines=1 + adjustsFontSizeToFit 로 긴 금액도 잘리지 않게 축소
 *   - 색은 토큰(tone). 기본 brand 오렌지.
 * AppText API 를 건드리지 않는 신규 컴포넌트.
 */
type AmountTone = 'brand' | 'primary' | 'inverse' | 'success' | 'error' | 'secondary';

interface AmountTextProps extends Omit<TextProps, 'children'> {
    children: React.ReactNode;
    /** 글자 크기 (기본 32, 권장 28~52) */
    size?: number;
    tone?: AmountTone;
    weight?: TextStyle['fontWeight'];
    center?: boolean;
    style?: StyleProp<TextStyle>;
}

export const AmountText: React.FC<AmountTextProps> = ({
    children,
    size = 32,
    tone = 'brand',
    weight = '800',
    center,
    style,
    ...rest
}) => {
    const c = useThemeColors();
    const toneColors: Record<AmountTone, string> = {
        brand: c.brandPrimary,
        primary: c.textPrimary,
        inverse: c.textInverse,
        success: c.success,
        error: c.error,
        secondary: c.textSecondary,
    };
    return (
        <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={[
                {
                    fontSize: size,
                    lineHeight: Math.round(size * 1.12),
                    fontWeight: weight,
                    letterSpacing: -1,
                    color: toneColors[tone],
                },
                center ? {textAlign: 'center'} : null,
                style,
            ]}
            {...rest}>
            {children}
        </Text>
    );
};

export default AppText;
