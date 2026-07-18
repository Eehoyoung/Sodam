import React from 'react';
import {Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {SODAM_LOGO} from '../../../assets/images';

interface SodamLogoProps {
    size?: number;
    /** Kept for call-site compatibility. Every variant uses the final brand asset. */
    variant?: 'default' | 'white' | 'simple';
    style?: StyleProp<ViewStyle>;
    imageStyle?: StyleProp<ImageStyle>;
}

export default function SodamLogo({
    size = 80,
    style,
    imageStyle,
}: SodamLogoProps) {
    return (
        <View style={[styles.container, {width: size, height: size}, style]}>
            <Image
                source={SODAM_LOGO}
                accessibilityLabel="소담 로고"
                resizeMode="contain"
                style={[styles.image, imageStyle]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
        transform: [{scale: 1.45}],
    },
});
