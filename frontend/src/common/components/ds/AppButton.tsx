/**
 * AppButton — 소담 단일 버튼 컴포넌트.
 *
 * 변형 (08-micro-design-final-spec.md §4):
 *   primary         — 화면당 1개 1차 행동, 오렌지 + 그림자
 *   secondary       — 흰 배경 + navy 텍스트 + border, 그림자 없음
 *   outline         — 보조 CTA (투명 + border)
 *   ghost           — 리스트/헤더 경량 액션
 *   destructive     — 삭제/탈퇴 (확인 단계에서만)
 *   invertedPrimary — 어두운 배경 위 흰 버튼
 *
 * 크기: sm(시각36/터치44 hitSlop) · md(48) · lg(52~56)
 * 로딩: busy 시 spinner + disabled, label 유지.
 * 접근성: accessibilityRole='button', state(disabled/busy).
 */
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';
import {colors, radius, shadow, spacing} from '../../../theme/tokens';

export type ButtonVariant =
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'destructive'
    | 'invertedPrimary';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
    label: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    /** 로딩 중 표시할 라벨 (예: '계산 중...'). 없으면 spinner 만 */
    loadingLabel?: string;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = {sm: 36, md: 48, lg: 54};

export const AppButton: React.FC<AppButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    size = 'lg',
    disabled = false,
    loading = false,
    loadingLabel,
    fullWidth = true,
    leftIcon,
    style,
    testID,
}) => {
    const isDisabled = disabled || loading;
    const palette = getPalette(variant, isDisabled);

    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            disabled={isDisabled}
            hitSlop={size === 'sm' ? 8 : undefined}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{disabled: isDisabled, busy: loading}}
            style={({pressed}) => [
                styles.base,
                {minHeight: HEIGHTS[size], backgroundColor: palette.bg, borderColor: palette.border},
                palette.border ? styles.bordered : null,
                variant === 'primary' && !isDisabled ? shadow.brand : null,
                fullWidth ? styles.fullWidth : styles.auto,
                pressed && !isDisabled ? styles.pressed : null,
                style,
            ]}>
            {loading ? (
                <View style={styles.row}>
                    <ActivityIndicator size="small" color={palette.fg} />
                    {loadingLabel ? (
                        <Text style={[styles.label, {color: palette.fg}, textSize(size)]}>
                            {'  '}
                            {loadingLabel}
                        </Text>
                    ) : null}
                </View>
            ) : (
                <View style={styles.row}>
                    {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
                    <Text
                        numberOfLines={1}
                        style={[styles.label, {color: palette.fg}, textSize(size)]}>
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    );
};

const getPalette = (
    variant: ButtonVariant,
    disabled: boolean,
): {bg: string; fg: string; border?: string} => {
    if (disabled) {
        return {bg: colors.surfaceMuted, fg: colors.textDisabled};
    }
    switch (variant) {
        case 'primary':
            return {bg: colors.brandPrimary, fg: colors.textInverse};
        case 'secondary':
            return {bg: colors.background, fg: colors.brandSecondary, border: colors.border};
        case 'outline':
            return {bg: 'transparent', fg: colors.brandPrimary, border: colors.border};
        case 'ghost':
            return {bg: 'transparent', fg: colors.brandPrimary};
        case 'destructive':
            return {bg: colors.background, fg: colors.error, border: colors.border};
        case 'invertedPrimary':
            return {bg: colors.background, fg: colors.brandSecondary};
        default:
            return {bg: colors.brandPrimary, fg: colors.textInverse};
    }
};

const textSize = (size: ButtonSize): TextStyle =>
    size === 'sm' ? {fontSize: 13} : {fontSize: 15};

const styles = StyleSheet.create({
    base: {
        borderRadius: radius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    bordered: {borderWidth: 1},
    fullWidth: {alignSelf: 'stretch'},
    auto: {alignSelf: 'center'},
    pressed: {opacity: 0.92, transform: [{scale: 0.97}]},
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
    icon: {marginRight: spacing.sm},
    label: {fontWeight: '800', textAlign: 'center'},
});

export default AppButton;
