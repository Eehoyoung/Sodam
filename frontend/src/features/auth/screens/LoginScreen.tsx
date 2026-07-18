import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {AppButton, AppInput, AppText, AppToast} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useResponsive} from '../../../common/hooks/useResponsive';
import SodamLogo from '../../../common/components/logo/SodamLogo';
import authApi from '../services/authApi';
import {useAuth} from '../../../contexts/AuthContext';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {AuthStackParamList} from '../../../navigation/types';
import {
    AuthPurpose,
    hasServerRole,
    pendingSlugToPurpose,
    resetToRootRoute,
    resolvePostAuthRoute,
} from '../../../navigation/authFlow';

interface LoginScreenProps {
    navigation: NavigationProp<any>;
    route: RouteProp<AuthStackParamList, 'Login'>;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * 로그인 — 홈 화면과 같은 라이트 캔버스 톤. 네비 헤더는 끄고(headerShown:false,
 * AuthNavigator 참고) 큰 마스코트 로고 하나만 브랜드 신호로 남긴다(작은 네비 로고와
 * 중복되지 않도록). 뒤로가기는 하드웨어 back/스와이프 제스처로 충분 — 별도 버튼 불필요.
 */
export default function LoginScreen({navigation, route}: LoginScreenProps) {
    const c = useThemeColors();
    const r = useResponsive();
    const logoSize = r.pick({compact: 88, default: 108});
    const scrollPadTop = r.isCompactHeight ? spacing.lg : spacing.xxl;
    const titleMargin = r.pick({compact: spacing.md, default: spacing.lg});
    const formMargin = r.pick({compact: spacing.lg, default: spacing.xl});
    const formGap = r.pick({compact: spacing.sm, default: spacing.md});
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const {login: authLogin, appleLogin} = useAuth();
    const selectedPurpose = route.params?.selectedPurpose;
    const [isAppleLoading, setIsAppleLoading] = useState(false);

    const consumePendingPurpose = async (loggedInUser: Awaited<ReturnType<typeof authLogin>>): Promise<AuthPurpose | undefined> => {
        const pending = await unifiedStorage.getItem('pendingPurposeAfterSignup');
        const pendingPurpose = pendingSlugToPurpose(pending);
        const fallbackPurpose = pendingPurpose ?? selectedPurpose;

        if (pendingPurpose && loggedInUser?.id && !hasServerRole(loggedInUser)) {
            try {
                await authApi.setPurpose(loggedInUser.id, pendingPurpose);
            } catch (_) {
                // The local fallback still keeps the first landing deterministic.
            }
        }

        if (pending) {
            await unifiedStorage.removeItem('pendingPurposeAfterSignup');
        }

        return fallbackPurpose;
    };

    const handleLogin = async () => {
        if (isLoading) {
            return;
        }
        if (!email || !password) {
            AppToast.error('이메일과 비밀번호를 입력해 주세요.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('올바른 이메일 형식으로 입력해 주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const loggedInUser = await authLogin(email, password);
            const fallbackPurpose = await consumePendingPurpose(loggedInUser);
            const nextRoute = resolvePostAuthRoute(loggedInUser, fallbackPurpose);

            if (nextRoute.name === 'Auth' && nextRoute.params.screen === 'Consent') {
                AppToast.success('로그인되었습니다. 서비스 이용을 위해 약관 동의를 완료해 주세요.');
            } else if (nextRoute.name === 'Auth' && nextRoute.params.screen === 'ProfileBasics') {
                AppToast.success('로그인되었습니다. 기본 정보를 마저 입력해 주세요.');
            } else {
                AppToast.success('로그인되었습니다.');
            }

            resetToRootRoute(navigation, nextRoute);
        } catch (error: any) {
            const status = error?.response?.status;
            const message = status === 401 || status === 403
                ? '이메일 또는 비밀번호가 맞지 않습니다. 다시 입력하거나 비밀번호 찾기를 이용해 주세요.'
                : '로그인에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.';
            AppToast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKakao = () => {
        navigation.navigate('KakaoLogin', {selectedPurpose});
    };

    // Sign in with Apple — iOS 전용(카카오 로그인을 제공하는 앱은 Apple 심사 가이드라인 4.8상 필수).
    // 브라우저 왕복 없이 네이티브 시트에서 바로 identityToken 을 받는다.
    const handleApple = async () => {
        if (isAppleLoading) {
            return;
        }
        setIsAppleLoading(true);
        try {
            const appleResponse = await appleAuth.performRequest({
                requestedOperation: appleAuth.Operation.LOGIN,
                requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
            });
            const {identityToken} = appleResponse;
            if (!identityToken) {
                throw new Error('Apple 인증 토큰을 받지 못했어요.');
            }
            const loggedInUser = await appleLogin(identityToken);
            const fallbackPurpose = await consumePendingPurpose(loggedInUser);
            const nextRoute = resolvePostAuthRoute(loggedInUser, fallbackPurpose);
            AppToast.success('Apple 계정으로 로그인되었습니다.');
            resetToRootRoute(navigation, nextRoute);
        } catch (error: any) {
            // 사용자가 시트를 닫은 취소는 실패로 취급하지 않고 조용히 무시한다.
            const message = String(error?.message ?? '');
            if (!/cancel/i.test(message)) {
                AppToast.error('Apple 로그인에 실패했습니다. 다시 시도해 주세요.');
            }
        } finally {
            setIsAppleLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.flex, {backgroundColor: c.surfaceCanvas}]} edges={['top', 'bottom']}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView
                    contentContainerStyle={[styles.scroll, {paddingTop: scrollPadTop}]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View style={styles.hero}>
                        <SodamLogo size={logoSize} variant="default" />
                        <AppText variant="headingLg" style={[styles.title, {marginTop: titleMargin}]}>
                            {'다시 오셨네요.\n바로 시작해요'}
                        </AppText>
                        <AppText variant="bodyLg" tone="secondary" style={styles.copy}>
                            {route.params?.fromSignup
                                ? '로그인하면 약관 동의와 기본 정보 설정을 이어서 진행해요.'
                                : '로그인 후 남은 설정이 있으면 먼저 안내해 드릴게요.'}
                        </AppText>
                    </View>

                    <View style={[styles.form, {marginTop: formMargin, gap: formGap}]}>
                        <AppInput
                            label="이메일"
                            placeholder="example@sodam.dev"
                            value={email}
                            onChangeText={t => {
                                setEmail(t);
                                if (emailError) {
                                    setEmailError(undefined);
                                }
                            }}
                            onBlur={() => setEmailError(email && !isValidEmail(email) ? '올바른 이메일 형식으로 입력해 주세요.' : undefined)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            error={emailError}
                        />
                        <AppInput
                            label="비밀번호"
                            placeholder="비밀번호"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8} style={styles.toggle}>
                            <AppText variant="caption" tone="brand" weight="700">
                                {showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                            </AppText>
                        </Pressable>

                        <AppButton label="로그인" loading={isLoading} onPress={handleLogin} style={styles.cta} />
                        <AppButton label="카카오로 계속" variant="secondary" onPress={handleKakao} />
                        {Platform.OS === 'ios' && (
                            <AppButton
                                label="Apple로 계속"
                                variant="secondary"
                                loading={isAppleLoading}
                                onPress={handleApple}
                            />
                        )}
                    </View>

                    <View style={styles.footerRow}>
                        <Pressable onPress={() => navigation.navigate('PasswordReset')} hitSlop={8}>
                            <AppText variant="caption" tone="secondary" style={styles.link}>비밀번호 찾기</AppText>
                        </Pressable>
                        <AppText variant="caption" tone="tertiary">·</AppText>
                        <Pressable onPress={() => navigation.navigate('Signup', {selectedPurpose})} hitSlop={8}>
                            <AppText variant="caption" tone="brand" weight="800">회원가입</AppText>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    scroll: {flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xl},
    hero: {alignItems: 'center'},
    title: {textAlign: 'center', letterSpacing: -0.6},
    copy: {marginTop: spacing.md, textAlign: 'center'},
    form: {marginTop: spacing.xl},
    toggle: {alignSelf: 'flex-end', marginTop: -spacing.xs},
    cta: {marginTop: spacing.sm},
    footerRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg},
    link: {fontWeight: '700'},
});
