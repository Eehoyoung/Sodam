import React from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {AppButton, AppHeader, AppText, Brandmark, useResponsive} from '../../../common/components/ds';
import {gradient, spacing} from '../../../theme/tokens';
import {RootStackParamList} from '../../../navigation/types';
import {AuthPurpose, purposeLabel} from '../../../navigation/authFlow';

interface WelcomeMainScreenProps {
    navigation: NavigationProp<any>;
    route: RouteProp<RootStackParamList, 'WelcomeMain'>;
}

export default function WelcomeMainScreen({navigation, route}: WelcomeMainScreenProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(40)).current;
    const insets = useSafeAreaInsets();
    const {isCompactHeight} = useResponsive();
    const selectedPurpose: AuthPurpose = route.params?.selectedPurpose ?? 'boss';
    const selectedLabel = purposeLabel(selectedPurpose);

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {toValue: 1, duration: 700, useNativeDriver: true}),
            Animated.timing(slideAnim, {toValue: 0, duration: 700, useNativeDriver: true}),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const handleLogin = () => navigation.navigate('Auth', {screen: 'Login', params: {selectedPurpose}});
    const handleSignup = () => navigation.navigate('Auth', {screen: 'Signup', params: {selectedPurpose}});

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
                        {`${selectedLabel} 흐름으로\n가입을 준비했어요`}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" center style={styles.copy}>
                        가입 후 로그인하면 서비스 이용에 필요한 약관 동의와 기본 정보를 이어서 설정합니다.
                    </AppText>
                </Animated.View>

                <View style={[styles.ctas, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton label={`${selectedLabel}으로 가입하기`} onPress={handleSignup} />
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
