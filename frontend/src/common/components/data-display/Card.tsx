import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../hooks/useThemeColors';

interface CardProps {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    onPress?: () => void;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    subtitleStyle?: TextStyle;
    contentStyle?: ViewStyle;
    /** 1=sm, 2=md, 3+=lg — 호환성 유지 */
    elevation?: number;
    bordered?: boolean;
    footer?: React.ReactNode;
}

/**
 * 레거시 카드 (EmployeeDetail 등에서 사용). 다크 테마 대응.
 */
const Card: React.FC<CardProps> = ({
    title,
    subtitle,
    children,
    onPress,
    style,
    titleStyle,
    subtitleStyle,
    contentStyle,
    elevation = 2,
    bordered = false,
    footer,
}) => {
    const c = useThemeColors();
    const styles = useMemo(() => makeStyles(c), [c]);
    const elevationStyle =
        elevation >= 4 ? tokens.shadow.lg : elevation >= 2 ? tokens.shadow.md : tokens.shadow.sm;

    const cardContent = (
        <>
            {(title || subtitle) && (
                <View style={styles.header}>
                    {title ? <Text style={[styles.title, titleStyle]}>{title}</Text> : null}
                    {subtitle ? (
                        <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
                    ) : null}
                </View>
            )}
            <View style={[styles.content, contentStyle]}>{children}</View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
        </>
    );

    const baseStyle: ViewStyle[] = [styles.card, elevationStyle];
    if (bordered) baseStyle.push(styles.bordered);
    if (style) baseStyle.push(style);

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({pressed}) => [
                    ...baseStyle,
                    pressed && {transform: [{scale: 0.99}]},
                ]}
            >
                {cardContent}
            </Pressable>
        );
    }
    return <View style={baseStyle}>{cardContent}</View>;
};

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    card: {
        backgroundColor: c.surface,
        borderRadius: tokens.radius.lg,
        marginVertical: tokens.spacing.sm,
        overflow: 'hidden' as const,
    },
    bordered: {
        borderWidth: 1,
        borderColor: c.divider,
    },
    header: {
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.lg,
        paddingBottom: tokens.spacing.sm,
    },
    title: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: c.textSecondary,
    },
    content: {
        padding: tokens.spacing.lg,
    },
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        borderTopWidth: 1,
        borderTopColor: c.divider,
        flexDirection: 'row' as const,
        justifyContent: 'flex-end' as const,
        gap: tokens.spacing.sm,
    },
});

export default Card;
