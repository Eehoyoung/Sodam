/**
 * Brandmark — 소담 로고 심볼 (확정 시안 .mark).
 * 둥근 사각 그라디언트 + 내부 글자 '소' (또는 커스텀).
 * 작은 로고에서는 내부 텍스트 단순화 (05-design-system.md 로고 개선 방향).
 */
import React from 'react';
import {StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {gradient} from '../../../theme/tokens';
import {useThemeColors} from '../../hooks/useThemeColors';

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
    textColor,
}) => {
    const c = useThemeColors();
    const dim = {width: size, height: size, borderRadius: size * 0.32};
    const fontSize = size * 0.42;
    const resolvedTextColor = textColor ?? c.textInverse;
    // 다크모드에서도 브랜드 오렌지 그림자는 동일 — 마크 자체가 브랜드.
    const shadowStyle = {
        shadowColor: c.brandPrimary,
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.28,
        shadowRadius: 20,
        elevation: 8,
    };

    if (backgroundColor) {
        return (
            <View style={[styles.box, dim, {backgroundColor}, style]}>
                <Text style={[styles.text, {fontSize, color: resolvedTextColor}]}>{label}</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={gradient.brand}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={[styles.box, dim, shadowStyle, style]}>
            <Text style={[styles.text, {fontSize, color: resolvedTextColor}]}>{label}</Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    box: {alignItems: 'center', justifyContent: 'center'},
    text: {fontWeight: '900'},
});

export default Brandmark;
