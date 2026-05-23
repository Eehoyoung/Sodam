import React from 'react';
import {StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {tokens} from '../../../theme/tokens';

type BadgeType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
    text: string;
    type?: BadgeType;
    size?: BadgeSize;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const TYPE_BG: Record<BadgeType, string> = {
    primary: '#FFEEDC',
    success: tokens.colors.successBg,
    warning: tokens.colors.warningBg,
    danger: tokens.colors.errorBg,
    info: tokens.colors.infoBg,
    neutral: tokens.colors.surfaceMuted,
};

const TYPE_FG: Record<BadgeType, string> = {
    primary: tokens.colors.brandPrimaryDark,
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    danger: tokens.colors.error,
    info: tokens.colors.info,
    neutral: tokens.colors.textSecondary,
};

const SIZE_PADDING: Record<BadgeSize, {v: number; h: number; fs: number}> = {
    small: {v: 2, h: 6, fs: 10},
    medium: {v: 4, h: 10, fs: 12},
    large: {v: 6, h: 14, fs: 13},
};

const Badge: React.FC<BadgeProps> = ({
    text,
    type = 'primary',
    size = 'medium',
    style,
    textStyle,
}) => {
    const sz = SIZE_PADDING[size];
    return (
        <View
            accessibilityRole="text"
            accessibilityLabel={text}
            style={[
                styles.badge,
                {
                    backgroundColor: TYPE_BG[type],
                    paddingVertical: sz.v,
                    paddingHorizontal: sz.h,
                },
                style,
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    {color: TYPE_FG[type], fontSize: sz.fs, fontWeight: '600', letterSpacing: -0.1},
                    textStyle,
                ]}
            >
                {text}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        borderRadius: tokens.radius.pill,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Badge;
