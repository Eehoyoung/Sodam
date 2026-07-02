import React, {useCallback, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppButton, AppText, AppToast, Brandmark} from '../../../common/components/ds';
import {gradient, spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';
import {useAuth} from '../../../contexts/AuthContext';
import {AuthStackParamList} from '../../../navigation/types';
import {resetToRootRoute, resolvePostAuthRoute} from '../../../navigation/authFlow';

type KakaoStatus = 'idle' | 'opening' | 'waiting' | 'cancelled' | 'failed' | 'success';

export const getKakaoCodeFromUrl = (url?: string | null): string | null => {
    if (!url) {
        return null;
    }
    const codeMatch = url.match(/[?&]code=([^&]+)/);
    return codeMatch ? decodeURIComponent(codeMatch[1]) : null;
};

export const hasKakaoError = (url?: string | null): boolean => {
    return !!url && /[?&]error=/.test(url);
};

const KakaoLoginScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const route = useRoute<RouteProp<AuthStackParamList, 'KakaoLogin'>>();
    const insets = useSafeAreaInsets();
    const [status, setStatus] = useState<KakaoStatus>('idle');
    const [message, setMessage] = useState('카카오 인증을 시작하면 브라우저가 열립니다.');
    const {kakaoLogin} = useAuth();

    const completeWithCode = useCallback(async (code: string) => {
        setStatus('opening');
        setMessage('카카오 인증 결과를 확인하고 있습니다.');
        try {
            const user = await kakaoLogin(code);
            setStatus('success');
            setMessage('인증이 완료되었습니다. 다음 단계로 이동합니다.');
            resetToRootRoute(navigation, resolvePostAuthRoute(user, route.params?.selectedPurpose));
        } catch (e: any) {
            setStatus('failed');
            const beMsg = e?.response?.data?.message;
            setMessage(typeof beMsg === 'string' ? beMsg : '카카오 인증에 실패했습니다. 다시 시도하거나 이메일 로그인을 이용해 주세요.');
            AppToast.error('카카오 인증에 실패했습니다.');
        }
    }, [kakaoLogin, navigation, route.params?.selectedPurpose]);

    const handleUrl = useCallback((url?: string | null) => {
        const code = getKakaoCodeFromUrl(url);
        if (code) {
            completeWithCode(code);
            return;
        }
        if (hasKakaoError(url)) {
            setStatus('failed');
            setMessage('카카오 인증이 완료되지 않았습니다. 다시 시도하거나 이메일 로그인으로 돌아갈 수 있어요.');
        }
    }, [completeWithCode]);

    useEffect(() => {
        const subscription = Linking.addEventListener('url', event => handleUrl(event.url));
        Linking.getInitialURL().then(handleUrl).catch(() => undefined);
        return () => subscription.remove();
    }, [handleUrl]);

    const startKakao = async () => {
        if (status === 'opening') {
            return;
        }
        setStatus('opening');
        setMessage('카카오 인증 화면을 여는 중입니다.');
        try {
            await authApi.openKakaoLogin();
            setStatus('waiting');
            setMessage('브라우저에서 인증을 마치면 앱으로 돌아옵니다. 돌아오지 않으면 이메일 로그인으로 진행해 주세요.');
        } catch (e: any) {
            setStatus('failed');
            setMessage('카카오 인증 화면을 열지 못했습니다. 네트워크 상태를 확인하거나 이메일 로그인을 이용해 주세요.');
            AppToast.error('카카오 로그인 시작에 실패했습니다.');
        }
    };

    const cancelKakao = () => {
        setStatus('cancelled');
        setMessage('카카오 로그인을 취소했습니다. 이메일 로그인으로 계속할 수 있어요.');
        navigation.navigate('Login', {selectedPurpose: route.params?.selectedPurpose});
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <View style={styles.center}>
                    <Brandmark size={64} label="K" backgroundColor="#FEE500" textColor="#191600" />
                    <AppText variant="display" tone="inverse" center style={styles.title}>
                        {'카카오로\n간편하게 계속'}
                    </AppText>
                    <AppText variant="bodyLg" tone="inverse" center style={styles.copy}>
                        {message}
                    </AppText>
                </View>

                <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm}]}>
                    <AppButton
                        label={status === 'waiting' ? '카카오 인증 다시 열기' : '카카오 인증 시작'}
                        variant="secondary"
                        loading={status === 'opening'}
                        onPress={startKakao}
                    />
                    {status === 'waiting' ? (
                        <AppButton
                            label="앱으로 돌아왔어요"
                            variant="ghost"
                            onPress={() => Linking.getInitialURL().then(handleUrl).catch(() => {
                                setStatus('failed');
                                setMessage('인증 결과를 찾지 못했습니다. 다시 시도해 주세요.');
                            })}
                        />
                    ) : null}
                    <AppButton
                        label={status === 'waiting' ? '취소하고 이메일 로그인' : '이메일로 로그인'}
                        variant="ghost"
                        onPress={status === 'waiting' ? cancelKakao : () => navigation.navigate('Login', {selectedPurpose: route.params?.selectedPurpose})}
                    />
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    flex: {flex: 1},
    center: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl},
    title: {marginTop: spacing.xxl, letterSpacing: -1},
    copy: {marginTop: spacing.md, opacity: 0.8, maxWidth: 320},
    footer: {paddingHorizontal: spacing.xxl, gap: spacing.sm},
});

export default KakaoLoginScreen;
