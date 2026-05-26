import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Brandmark} from '../../../common/components/ds';
import {colors, spacing, tokens} from '../../../theme/tokens';

interface Props {
    /** 최소 노출 시간 (ms). 빠르게 부트되어도 브랜드 인상 확보. */
    minDurationMs?: number;
    /** 표시 완료 콜백 (호출 측에서 인증 검증 후 navigation reset) */
    onReady?: () => void;
}

/**
 * 00 Splash — 확정 시안.
 * 다크 네이비 배경 + 브랜드 마크 페이드 인 + 슬로건. 최소 0.8초, 최대 1.6초 노출.
 */
const SplashScreen: React.FC<Props> = ({minDurationMs = 800, onReady}) => {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.9)).current;
    const sloganOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const start = Date.now();
        Animated.parallel([
            Animated.timing(logoOpacity, {toValue: 1, duration: 400, useNativeDriver: true}),
            Animated.spring(logoScale, {toValue: 1, friction: 6, tension: 80, useNativeDriver: true}),
        ]).start();

        const sloganTimer = setTimeout(() => {
            Animated.timing(sloganOpacity, {toValue: 1, duration: 400, useNativeDriver: true}).start();
        }, 500);

        const readyTimer = setTimeout(() => {
            const elapsed = Date.now() - start;
            const wait = Math.max(0, minDurationMs - elapsed);
            setTimeout(() => onReady?.(), wait);
        }, 1100);

        return () => {
            clearTimeout(sloganTimer);
            clearTimeout(readyTimer);
        };
    }, [logoOpacity, logoScale, sloganOpacity, minDurationMs, onReady]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={tokens.gradient.darkScreen}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradient}>
                <View style={styles.center}>
                    <Animated.View style={{opacity: logoOpacity, transform: [{scale: logoScale}]}}>
                        <Brandmark size={64} />
                    </Animated.View>
                    <Animated.Text style={[styles.brandName, {opacity: logoOpacity}]}>소담</Animated.Text>
                    <Animated.Text style={[styles.slogan, {opacity: sloganOpacity}]}>
                        작은 가게의 오늘 할 일을 바로 끝내는 운영 비서
                    </Animated.Text>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: '#1B2A33'},
    gradient: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    center: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl},
    brandName: {
        fontSize: 35,
        fontWeight: '900',
        color: colors.textInverse,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    slogan: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.textInverse,
        opacity: 0.78,
        textAlign: 'center',
    },
});

export default SplashScreen;
