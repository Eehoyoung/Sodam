import React from 'react';
import {StyleSheet, Text, TextStyle, View, ViewStyle} from 'react-native';
import {tokens} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

type BadgeType = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
    text: string;
    type?: BadgeType;
    size?: BadgeSize;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

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
    const c = useThemeColors();
    // primary 톤의 연한 오렌지 배경은 라이트의 #FFEEDC → 다크에서는 brand soft 사용
    const typeBg: Record<BadgeType, string> = {
        primary: c.brandPrimarySoft,
        success: c.successBg,
        warning: c.warningBg,
        danger: c.errorBg,
        info: c.infoBg,
        neutral: c.surfaceMuted,
    };
    const typeFg: Record<BadgeType, string> = {
        primary: c.brandPrimaryDark,
        success: c.success,
        warning: c.warning,
        danger: c.error,
        info: c.info,
        neutral: c.textSecondary,
    };
    const sz = SIZE_PADDING[size];
    return (
        <View
            accessibilityRole="text"
            accessibilityLabel={text}
            style={[
                styles.badge,
                {
                    backgroundColor: typeBg[type],
                    paddingVertical: sz.v,
                    paddingHorizontal: sz.h,
                },
                style,
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    {color: typeFg[type], fontSize: sz.fs, fontWeight: '600', letterSpacing: -0.1},
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
