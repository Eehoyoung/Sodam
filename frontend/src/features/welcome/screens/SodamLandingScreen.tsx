/* eslint-disable react-native/no-color-literals -- 다크 인트로 톤(Splash/RoleStart/KakaoLogin과 동일 계열) 고정 헤더 배지 색상. */
import React, {useEffect, useRef} from 'react';
import {Animated, Pressable, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {NavigationProp} from '@react-navigation/native';
import {AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {gradient, radius, spacing} from '../../../theme/tokens';
import {RootStackParamList} from '../../../navigation/types';

interface Props {
    navigation: NavigationProp<RootStackParamList>;
}

/**
 * 02 WelcomeMain — 확정 시안(docs/260720/260720_V3_링패스_적용_계획서.md §4.1).
 * Splash/KakaoLogin과 동일한 gradient.darkScreen 다크 인트로 톤 — 이전에는 여기만 별도
 * 레거시 COLORS 팔레트(구 v2 네이비, theme/tokens.ts v3 리매핑이 닿지 않는 파일)를 써서
 * 흰 배경 + 네이비 로고로 어긋나 있었다. 로직/카피 흐름은 그대로, 시각 레이어만 교체.
 * "무료로 시작하기"는 Signup으로 바로 가지 않고 RoleStart(01, 역할 선택)를 먼저 거친다.
 */
export default function SodamLandingScreen({navigation}: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {toValue: 1, duration: 700, useNativeDriver: true}),
            Animated.timing(slideAnim, {toValue: 0, duration: 700, useNativeDriver: true}),
        ]).start();
    }, [fadeAnim, slideAnim]);

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.headerRow}>
                    <AppText variant="caption" tone="inverse" style={styles.headerTitle}>소담</AppText>
                    <Pressable
                        onPress={() => navigation.navigate('Auth', {screen: 'Login'})}
                        accessibilityRole="button"
                        accessibilityLabel="로그인">
                        <View style={styles.headerPill}>
                            <AppText variant="caption" weight="700" style={styles.headerPillText}>
                                로그인
                            </AppText>
                        </View>
                    </Pressable>
                </View>
                <Animated.View
                    style={[
                        styles.content,
                        {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
                    ]}>
                    <View style={styles.logoZone}>
                        <Brandmark size={64} />
                        <AppText variant="headingLg" tone="inverse" center style={styles.brandTitle}>
                            {'월말 정산이\n30분 안에 끝나요'}
                        </AppText>
                        <AppText variant="bodyMd" tone="inverse" center style={styles.tagline}>
                            GPS·NFC 출퇴근, 자동 급여 계산, 직원 명세 확인을 한 번에.
                        </AppText>
                    </View>

                    <View style={styles.buttons}>
                        <AppButton
                            label="무료로 시작하기"
                            onPress={() => navigation.navigate('Auth', {screen: 'RoleStart'})}
                        />
                        <AppButton
                            label="이미 계정이 있어요"
                            variant="secondary"
                            onPress={() => navigation.navigate('Auth', {screen: 'Login'})}
                        />
                    </View>
                </Animated.View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.sm,
    },
    headerTitle: {
        opacity: 0.65,
    },
    headerPill: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
    },
    headerPillText: {
        color: '#F5F3EF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xl,
        paddingTop: spacing.xl,
    },
    logoZone: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    brandTitle: {
        marginTop: spacing.lg,
        letterSpacing: -0.6,
    },
    tagline: {
        marginTop: spacing.sm,
        opacity: 0.78,
        maxWidth: 280,
    },
    buttons: {
        gap: spacing.sm,
    },
});
