import React from 'react';
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

export type ButtonVariant =
    | 'primary'      // 브랜드 솔리드 (메인 CTA)
    | 'secondary'    // 다크 톤
    | 'outline'      // 보더 + 투명 배경
    | 'ghost'        // 텍스트만
    | 'text'         // [legacy alias of ghost]
    | 'destructive'; // 빨간 (해지·삭제)

export type ButtonSize = 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';

export interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    /** @deprecated Use `variant` instead. Kept for backwards-compatibility with legacy screens. */
    type?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    /** @deprecated 사용 안 됨 (이전 디자인 호환) */
    icon?: React.ReactNode;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    textStyle?: TextStyle;
    /** 접근성 라벨 — title 과 다르게 음성 안내하고 싶을 때 */
    accessibilityLabel?: string;
    testID?: string;
}

/**
 * 소담 디자인 시스템의 기본 버튼.
 *
 * 디자인 원칙:
 *  - 최소 터치 영역 44pt (HIG)
 *  - 브랜드 그림자(primary 만) — 가벼운 글로우
 *  - press 시 scale 0.97 (시각 피드백) — 단순 opacity 가 아닌 압력감
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
    // legacy alias 호환: type prop 우선 사용, 둘 다 없으면 primary
    const resolvedVariant: ButtonVariant = normalizeVariant(variant ?? type ?? 'primary');
    const resolvedSize = normalizeSize(size);
    const variantStyles = VARIANT_MAP[resolvedVariant];
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
                isInactive && styles.disabled,
                pressed && !isInactive && {transform: [{scale: 0.97}]},
                resolvedVariant === 'primary' && !isInactive && tokens.shadow.brand,
                style as ViewStyle,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={variantStyles.text.color}
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

/** legacy 'text' alias → 'ghost' 로 정규화. */
function normalizeVariant(v: ButtonVariant): Exclude<ButtonVariant, 'text'> {
    return v === 'text' ? 'ghost' : v;
}
/** legacy 'small/medium/large' → 'sm/md/lg' 로 정규화. */
function normalizeSize(s: ButtonSize): 'sm' | 'md' | 'lg' {
    if (s === 'small') return 'sm';
    if (s === 'medium') return 'md';
    if (s === 'large') return 'lg';
    return s;
}

const VARIANT_MAP: Record<Exclude<ButtonVariant, 'text'>, {container: ViewStyle; text: TextStyle}> = {
    primary: {
        container: {backgroundColor: tokens.colors.brandPrimary},
        text: {color: tokens.colors.textInverse},
    },
    secondary: {
        container: {backgroundColor: tokens.colors.brandSecondary},
        text: {color: tokens.colors.textInverse},
    },
    outline: {
        container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: tokens.colors.brandPrimary,
        },
        text: {color: tokens.colors.brandPrimary},
    },
    ghost: {
        container: {backgroundColor: 'transparent'},
        text: {color: tokens.colors.brandPrimary},
    },
    destructive: {
        container: {backgroundColor: tokens.colors.error},
        text: {color: tokens.colors.textInverse},
    },
};

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
    disabled: {
        backgroundColor: tokens.colors.surfaceMuted,
        borderColor: tokens.colors.border,
        opacity: 0.7,
    },
    iconLeft: {marginRight: tokens.spacing.sm},
    iconRight: {marginLeft: tokens.spacing.sm},
    text: {
        letterSpacing: -0.2,
    },
});

export default Button;
