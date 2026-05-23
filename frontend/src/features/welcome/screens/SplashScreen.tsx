import React, {useEffect, useRef} from 'react';
import {Animated, Dimensions, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {tokens} from '../../../theme/tokens';

interface Props {
    /** 최소 노출 시간 (ms). 빠르게 부트되어도 브랜드 인상 확보. */
    minDurationMs?: number;
    /** 표시 완료 콜백 (호출 측에서 인증 검증 후 navigation reset) */
    onReady?: () => void;
}

/**
 * 소담 스플래시 (PRD_GUEST G-001).
 *
 * - 브랜드 그라디언트 #FF7A1A → #FF5722 (135도)
 * - 로고 페이드 인 + 슬로건 1.5초 후 페이드 인
 * - 최소 0.8초, 최대 1.6초 노출
 */
const SplashScreen: React.FC<Props> = ({minDurationMs = 800, onReady}) => {
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.9)).current;
    const sloganOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const start = Date.now();
        Animated.parallel([
            Animated.timing(logoOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.spring(logoScale, {
                toValue: 1,
                friction: 6,
                tension: 80,
                useNativeDriver: true,
            }),
        ]).start();

        const sloganTimer = setTimeout(() => {
            Animated.timing(sloganOpacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
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
                colors={tokens.gradient.brand}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.gradient}
            >
                <View style={styles.center}>
                    <Animated.View
                        style={[
                            styles.logoCircle,
                            {opacity: logoOpacity, transform: [{scale: logoScale}]},
                        ]}
                    >
                        <Text style={styles.logoChar}>소</Text>
                    </Animated.View>
                    <Animated.Text style={[styles.brandName, {opacity: logoOpacity}]}>
                        소담
                    </Animated.Text>
                    <Animated.Text style={[styles.slogan, {opacity: sloganOpacity}]}>
                        소상공인을 담다
                    </Animated.Text>
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
    safeArea: {flex: 1},
    gradient: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    center: {alignItems: 'center', justifyContent: 'center'},
    logoCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: tokens.spacing.xxl,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.32)',
    },
    logoChar: {
        fontSize: 64,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textInverse,
        letterSpacing: -2,
        marginTop: -4,
    },
    brandName: {
        fontSize: 40,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textInverse,
        letterSpacing: 4,
        marginBottom: tokens.spacing.md,
    },
    slogan: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textInverse,
        opacity: 0.85,
        letterSpacing: 1,
    },
});

export default SplashScreen;
