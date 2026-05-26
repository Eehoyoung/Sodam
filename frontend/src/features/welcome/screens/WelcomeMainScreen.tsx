import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {NavigationProp} from '@react-navigation/native';
import {AppButton, AppHeader, AppText, Brandmark, useResponsive} from '../../../common/components/ds';
import {gradient, spacing} from '../../../theme/tokens';

interface WelcomeMainScreenProps {
    navigation: NavigationProp<any>;
}

/**
 * 02 WelcomeMain — 확정 시안.
 * 다크 네이비 배경, 중앙 브랜드 마크 + 히어로 카피, 하단 1차/2차 CTA.
 */
export default function WelcomeMainScreen({navigation}: WelcomeMainScreenProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(40)).current;
    const insets = useSafeAreaInsets();
    const {isCompactHeight} = useResponsive();

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {toValue: 1, duration: 700, useNativeDriver: true}),
            Animated.timing(slideAnim, {toValue: 0, duration: 700, useNativeDriver: true}),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const handleLogin = () => navigation.navigate('Auth', {screen: 'Login'});
    const handleSignup = () => navigation.navigate('Auth', {screen: 'Signup'});

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <AppHeader
                    dark
                    title="소담"
                    actions={[{label: '로그인', onPress: handleLogin, accessibilityLabel: '로그인'}]}
                />
                <Animated.View
                    style={[
                        styles.hero,
                        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
                    ]}>
                    <Brandmark size={isCompactHeight ? 52 : 58} />
                    <AppText variant="headingLg" tone="inverse" center style={styles.title}>
                        {'월말 정산이\n30분 안에 끝나요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" center style={styles.copy}>
                        NFC와 GPS 출퇴근, 자동 급여 계산, 직원 명세 확인을 한 번에.
                    </AppText>
                </Animated.View>

                <View style={[styles.ctas, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton label="무료로 시작하기" onPress={handleSignup} />
                    <AppButton label="이미 계정이 있어요" variant="secondary" onPress={handleLogin} />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    hero: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl},
    title: {marginTop: spacing.lg},
    copy: {marginTop: spacing.sm, opacity: 0.82, maxWidth: 320},
    ctas: {paddingHorizontal: spacing.lg, gap: spacing.sm},
});
