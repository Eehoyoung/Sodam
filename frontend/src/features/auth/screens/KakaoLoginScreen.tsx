import React, {useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {AppButton, AppText, Brandmark} from '../../../common/components/ds';
import {gradient, spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';

/**
 * 07 KakaoLogin — 확정 시안.
 * 다크 배경 + 카카오 마크 + 동의 계속 CTA. (PRD_GUEST G-008)
 *
 * TODO[CONFIRM-C-7]: 실 카카오 키 발급 후 SDK(@react-native-seoul/kakao-login) 도입으로 교체.
 */
const KakaoLoginScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);

    const startKakao = async () => {
        setLoading(true);
        try {
            await authApi.openKakaoLogin();
            // 콜백 후 AuthContext 가 user 설정 → navigation reset
        } catch (e: any) {
            Alert.alert('카카오 로그인 실패', '잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.center}>
                    <Brandmark size={58} label="K" backgroundColor="#FEE500" textColor="#191600" />
                    <AppText variant="headingLg" tone="inverse" center style={styles.title}>
                        {'카카오로\n간편하게 계속'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" center style={styles.copy}>
                        처음 한 번만 동의하면 다음부터 바로 들어올 수 있어요.
                    </AppText>
                </View>

                <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton
                        label="카카오 동의 계속하기"
                        variant="secondary"
                        loading={loading}
                        onPress={startKakao}
                    />
                    <AppButton
                        label="이메일로 로그인"
                        variant="ghost"
                        onPress={() => navigation.navigate('Login')}
                    />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl},
    title: {marginTop: spacing.lg},
    copy: {marginTop: spacing.sm, opacity: 0.8, maxWidth: 300},
    footer: {paddingHorizontal: spacing.lg, gap: spacing.sm},
});

export default KakaoLoginScreen;
