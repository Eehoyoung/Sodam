/**
 * Brandmark — 소담 로고 심볼 (확정 시안 .mark).
 * 둥근 사각 그라디언트 + 내부 글자 '소' (또는 커스텀).
 * 작은 로고에서는 내부 텍스트 단순화 (05-design-system.md 로고 개선 방향).
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, gradient} from '../../../theme/tokens';

interface BrandmarkProps {
    size?: number;
    label?: string;
    style?: StyleProp<ViewStyle>;
    /** 그라디언트 대신 단색 배경 */
    backgroundColor?: string;
    textColor?: string;
}

export const Brandmark: React.FC<BrandmarkProps> = ({
    size = 56,
    label = '소',
    style,
    backgroundColor,
    textColor = colors.textInverse,
}) => {
    const dim = {width: size, height: size, borderRadius: size * 0.32};
    const fontSize = size * 0.42;

    if (backgroundColor) {
        return (
            <View style={[styles.box, dim, {backgroundColor}, style]}>
                <Text style={[styles.text, {fontSize, color: textColor}]}>{label}</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={gradient.brand}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[styles.box, dim, styles.shadow, style]}>
            <Text style={[styles.text, {fontSize, color: textColor}]}>{label}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    box: {alignItems: 'center', justifyContent: 'center'},
    shadow: {
        shadowColor: colors.brandPrimary,
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 8,
    },
    text: {fontWeight: '900'},
});

export default Brandmark;
