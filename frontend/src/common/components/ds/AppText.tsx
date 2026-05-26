/**
 * AppText — 타이포 스케일 적용 텍스트.
 * variant 는 05-design-system.md 타이포 표(typography.scale)와 1:1.
 * tone 으로 색을 고른다 (다크 카드 위에서는 tone="inverse").
 */
import React from 'react';
import {StyleProp, Text, TextProps, TextStyle} from 'react-native';
import {colors, typography} from '../../../theme/tokens';

type Variant = keyof typeof typography.scale;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'inverse' | 'success' | 'error' | 'warning';

interface AppTextProps extends TextProps {
    variant?: Variant;
    tone?: Tone;
    weight?: TextStyle['fontWeight'];
    center?: boolean;
    style?: StyleProp<TextStyle>;
}

const TONE_COLORS: Record<Tone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    brand: colors.brandPrimary,
    inverse: colors.textInverse,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
};

export const AppText: React.FC<AppTextProps> = ({
    variant = 'bodyMd',
    tone = 'primary',
    weight,
    center,
    style,
    children,
    ...rest
}) => {
    const s = typography.scale[variant];
    return (
        <Text
            style={[
                {
                    fontSize: s.fontSize,
                    lineHeight: s.lineHeight,
                    fontWeight: weight ?? s.fontWeight,
                    color: TONE_COLORS[tone],
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
