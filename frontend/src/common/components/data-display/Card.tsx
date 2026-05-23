import React from 'react';
import {Pressable, StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {tokens} from '../../../theme/tokens';

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
 * 소담 카드 컴포넌트.
 * 디자인은 tokens 기반으로 통일되며, 기존 API(title/subtitle/bordered/elevation/footer)는 유지된다.
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

const styles = StyleSheet.create({
    card: {
        backgroundColor: tokens.colors.surface,
        borderRadius: tokens.radius.lg,
        marginVertical: tokens.spacing.sm,
        overflow: 'hidden',
    },
    bordered: {
        borderWidth: 1,
        borderColor: tokens.colors.divider,
    },
    header: {
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.lg,
        paddingBottom: tokens.spacing.sm,
    },
    title: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.sm,
        color: tokens.colors.textSecondary,
    },
    content: {
        padding: tokens.spacing.lg,
    },
    footer: {
        paddingHorizontal: tokens.spacing.lg,
        paddingVertical: tokens.spacing.md,
        borderTopWidth: 1,
        borderTopColor: tokens.colors.divider,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: tokens.spacing.sm,
    },
});

export default Card;
