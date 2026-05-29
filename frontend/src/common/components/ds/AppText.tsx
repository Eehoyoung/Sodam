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

export default AppText;
