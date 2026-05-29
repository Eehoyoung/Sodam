import React, {useMemo} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../hooks/useThemeColors';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'text'
    | 'destructive';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';

export interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    type?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle;
    accessibilityLabel?: string;
    testID?: string;
}

/**
 * 레거시 버튼 — EmployeeDetail 등에서 사용. 다크 테마 대응.
 */
const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant,
    type,
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    icon,
    rightIcon,
    style,
    textStyle,
    accessibilityLabel,
    testID,
}) => {
    const c = useThemeColors();
    const variantMap = useMemo(() => buildVariantMap(c), [c]);
    const resolvedVariant: Exclude<ButtonVariant, 'text'> = normalizeVariant(variant ?? type ?? 'primary');
    const resolvedSize = normalizeSize(size);
    const variantStyles = variantMap[resolvedVariant];
    const sizeStyles = SIZE_MAP[resolvedSize];
    const leftAdorn = leftIcon ?? icon;

    const isInactive = disabled || loading;

    return (
        <Pressable
            onPress={onPress}
            disabled={isInactive}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityState={{disabled: isInactive, busy: loading}}
            testID={testID}
            style={({pressed}) => [
                styles.base,
                sizeStyles.container,
                variantStyles.container,
                fullWidth && styles.fullWidth,
                isInactive && {backgroundColor: c.surfaceMuted, borderColor: c.border, opacity: 0.7},
                pressed && !isInactive && {transform: [{scale: 0.97}]},
                resolvedVariant === 'primary' && !isInactive && tokens.shadow.brand,
                style as ViewStyle,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variantStyles.text.color as string}
                />
            ) : (
                <View style={styles.inner}>
                    {leftAdorn ? <View style={styles.iconLeft}>{leftAdorn}</View> : null}
                    <Text
                        numberOfLines={1}
                        style={[styles.text, sizeStyles.text, variantStyles.text, textStyle]}
                    >
                        {title}
                    </Text>
                    {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
                </View>
            )}
        </Pressable>
    );
};

function normalizeVariant(v: ButtonVariant): Exclude<ButtonVariant, 'text'> {
    return v === 'text' ? 'ghost' : v;
}
function normalizeSize(s: ButtonSize): 'sm' | 'md' | 'lg' {
    if (s === 'small') return 'sm';
    if (s === 'medium') return 'md';
    if (s === 'large') return 'lg';
    return s;
}

const buildVariantMap = (c: ThemeColors): Record<Exclude<ButtonVariant, 'text'>, {container: ViewStyle; text: TextStyle}> => ({
    primary: {
        container: {backgroundColor: c.brandPrimary},
        text: {color: c.textInverse},
    },
    secondary: {
        container: {backgroundColor: c.brandSecondary},
        text: {color: c.textInverse},
    },
    outline: {
        container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: c.brandPrimary,
        },
        text: {color: c.brandPrimary},
    },
    ghost: {
        container: {backgroundColor: 'transparent'},
        text: {color: c.brandPrimary},
    },
    destructive: {
        container: {backgroundColor: c.error},
        text: {color: c.textInverse},
    },
});

const SIZE_MAP: Record<'sm' | 'md' | 'lg', {container: ViewStyle; text: TextStyle}> = {
    sm: {
        container: {
            minHeight: 36,
            paddingHorizontal: tokens.spacing.lg,
            borderRadius: tokens.radius.md,
        },
        text: {fontSize: tokens.typography.sizes.sm, fontWeight: tokens.typography.weights.semibold},
    },
    md: {
        container: {
            minHeight: 48,
            paddingHorizontal: tokens.spacing.xxl,
            borderRadius: tokens.radius.lg,
        },
        text: {fontSize: tokens.typography.sizes.md, fontWeight: tokens.typography.weights.semibold},
    },
    lg: {
        container: {
            minHeight: 56,
            paddingHorizontal: tokens.spacing.xxxl,
            borderRadius: tokens.radius.xl,
        },
        text: {fontSize: tokens.typography.sizes.lg, fontWeight: tokens.typography.weights.bold},
    },
};

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullWidth: {width: '100%'},
    iconLeft: {marginRight: tokens.spacing.sm},
    iconRight: {marginLeft: tokens.spacing.sm},
    text: {
        letterSpacing: -0.2,
    },
});

export default Button;
