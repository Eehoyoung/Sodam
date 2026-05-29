/**
 * AppCard — 정보 구획 카드.
 *
 * 변형 (08-micro-design-final-spec.md §5):
 *   flat     — 기본 정보 구획 (흰 배경 + border)
 *   elevated — 핵심 요약 (흰 배경 + 그림자)
 *   outlined — 선택 가능 카드 (border 강조)
 *   warm     — 안내/추천 (warm 배경)
 *   navy     — HeroCard (navy 배경 + 흰 텍스트)
 *   danger   — 위험/경고 (amber 배경)
 *
 * 규칙: 카드 안 카드 금지 · 반복 아이템 radius lg(12) · 홈 핵심 요약만 xxl(24).
 * onPress 제공 시 터치 카드(accessibilityRole='button', pressScale)로 동작.
 */
import React, {ReactNode} from 'react';
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../hooks/useThemeColors';

export type CardVariant = 'flat' | 'elevated' | 'outlined' | 'warm' | 'navy' | 'danger';

interface AppCardProps {
    children: ReactNode;
    variant?: CardVariant;
    /** HeroCard 용 큰 radius(24) */
    hero?: boolean;
    onPress?: () => void;
    accessibilityLabel?: string;
    selected?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
}

/** navy 카드 내부 텍스트가 흰색이어야 하는지 자식이 알 수 있도록 노출 */
export const isInverseCard = (variant?: CardVariant) => variant === 'navy';

export const AppCard: React.FC<AppCardProps> = ({
    children,
    variant = 'flat',
    hero = false,
    onPress,
    accessibilityLabel,
    selected = false,
    style,
    testID,
}) => {
    const c = useThemeColors();
    const base: ViewStyle[] = [
        styles.base,
        {borderRadius: hero ? radius.xxl : radius.xl},
        variantStyle(variant, c),
        selected ? {borderWidth: 2, borderColor: c.brandPrimary} : null,
    ].filter(Boolean) as ViewStyle[];

    if (onPress) {
        return (
            <Pressable
                testID={testID}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{selected}}
                style={({pressed}) => [...base, pressed ? styles.pressed : null, style]}>
                {children}
            </Pressable>
        );
    }

    return (
        <View testID={testID} style={[...base, style]}>
            {children}
        </View>
    );
};

const variantStyle = (variant: CardVariant, c: ThemeColors): ViewStyle => {
    switch (variant) {
        case 'elevated':
            return {backgroundColor: c.background, ...shadow.md};
        case 'outlined':
            return {backgroundColor: c.background, borderWidth: 1, borderColor: c.borderStrong};
        case 'warm':
            return {backgroundColor: c.surfaceWarm, borderWidth: 1, borderColor: c.brandPrimaryMuted};
        case 'navy':
            return {backgroundColor: c.brandSecondary, borderWidth: 0};
        case 'danger':
            return {backgroundColor: c.warningBg, borderWidth: 1, borderColor: c.warning};
        case 'flat':
        default:
            return {backgroundColor: c.background, borderWidth: 1, borderColor: c.border};
    }
};

const styles = StyleSheet.create({
    base: {
        padding: spacing.lg,
        minWidth: 0,
    },
    pressed: {opacity: 0.95, transform: [{scale: 0.99}]},
});

export default AppCard;
