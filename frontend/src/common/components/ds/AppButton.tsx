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
import {shadow, spacing} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../hooks/useThemeColors';

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

// v3 토스식: primary CTA 는 더 크고 자신감 있게(56). sm/md 는 보조 액션 유지.
const HEIGHTS: Record<ButtonSize, number> = {sm: 38, md: 50, lg: 56};

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
    const c = useThemeColors();
    const isDisabled = disabled || loading;
    const palette = getPalette(variant, isDisabled, c);

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
    c: ThemeColors,
): {bg: string; fg: string; border?: string} => {
    if (disabled) {
        return {bg: c.surfaceMuted, fg: c.textDisabled};
    }
    switch (variant) {
        case 'primary':
            return {bg: c.brandPrimary, fg: c.textInverse};
        case 'secondary':
            // v3: 네이비 outline (배경 흰색 + 네이비 텍스트 + 네이비 보더)
            return {bg: c.background, fg: c.brandSecondary, border: c.brandSecondary};
        case 'outline':
            return {bg: 'transparent', fg: c.brandPrimary, border: c.border};
        case 'ghost':
            return {bg: 'transparent', fg: c.brandPrimary};
        case 'destructive':
            return {bg: c.background, fg: c.error, border: c.border};
        case 'invertedPrimary':
            return {bg: c.background, fg: c.brandSecondary};
        default:
            return {bg: c.brandPrimary, fg: c.textInverse};
    }
};

const textSize = (size: ButtonSize): TextStyle => {
    if (size === 'sm') {
        return {fontSize: 13};
    }
    if (size === 'md') {
        return {fontSize: 15};
    }
    return {fontSize: 16}; // lg: 더 큰 1차 CTA
};

const styles = StyleSheet.create({
    base: {
        // v3 토스식: 더 부드러운 라운드(18) + 촉감 있는 press(0.975)
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    bordered: {borderWidth: 1},
    fullWidth: {alignSelf: 'stretch'},
    auto: {alignSelf: 'center'},
    pressed: {opacity: 0.94, transform: [{scale: 0.975}]},
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center'},
    icon: {marginRight: spacing.sm},
    label: {fontWeight: '700', textAlign: 'center', letterSpacing: -0.2},
});

export default AppButton;
