import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {AppButton, AppInput, AppText, AppToast, Brandmark} from '../../../common/components/ds';
import {gradient, spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
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

export default function LoginScreen({navigation, route}: LoginScreenProps) {
    const r = useResponsive();
    const brandSize = r.pick({compact: 48, default: 56});
    const scrollPadTop = r.isCompactHeight ? spacing.lg : spacing.xxl;
    const titleMargin = r.pick({compact: spacing.md, default: spacing.lg});
    const formMargin = r.pick({compact: spacing.lg, default: spacing.xl});
    const formGap = r.pick({compact: spacing.sm, default: spacing.md});
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);

    const {login: authLogin} = useAuth();
    const selectedPurpose = route.params?.selectedPurpose;

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

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <ScrollGuard scrollPadTop={scrollPadTop}>
                    <Brandmark size={brandSize} />
                    <AppText variant="headingLg" tone="inverse" style={[styles.title, {marginTop: titleMargin}]}>
                        {'다시 오셨네요.\n바로 시작해요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.copy}>
                        {route.params?.fromSignup
                            ? '가입한 계정으로 로그인하면 약관 동의와 기본 정보 설정을 이어서 진행합니다.'
                            : '로그인 후 필요한 설정이 남아 있으면 먼저 안내해 드립니다.'}
                    </AppText>

                    <View style={[styles.form, {marginTop: formMargin, gap: formGap}]}>
                        <AppInput
                            placeholder="이메일"
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
                            placeholder="비밀번호"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <Pressable onPress={() => setShowPassword(s => !s)} hitSlop={8} style={styles.toggle}>
                            <AppText variant="caption" tone="inverse" style={styles.toggleText}>
                                {showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                            </AppText>
                        </Pressable>

                        <AppButton label="로그인" loading={isLoading} onPress={handleLogin} style={styles.cta} />
                        <AppButton label="카카오로 계속" variant="secondary" onPress={handleKakao} />
                    </View>

                    <View style={styles.footerRow}>
                        <Pressable onPress={() => navigation.navigate('PasswordReset')} hitSlop={8}>
                            <AppText variant="caption" tone="inverse" style={styles.link}>비밀번호 찾기</AppText>
                        </Pressable>
                        <AppText variant="caption" tone="inverse" style={styles.dot}>·</AppText>
                        <Pressable onPress={() => navigation.navigate('Signup', {selectedPurpose})} hitSlop={8}>
                            <AppText variant="caption" tone="inverse" style={styles.link}>회원가입</AppText>
                        </Pressable>
                    </View>
                </ScrollGuard>
            </SafeAreaView>
        </LinearGradient>
    );
}

const ScrollGuard: React.FC<{children: React.ReactNode; scrollPadTop?: number}> = ({children, scrollPadTop}) => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
            contentContainerStyle={[styles.scroll, scrollPadTop !== null && scrollPadTop !== undefined && {paddingTop: scrollPadTop}]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
        </ScrollView>
    </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
    flex: {flex: 1},
    scroll: {flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl},
    title: {marginTop: spacing.lg},
    copy: {marginTop: spacing.sm, opacity: 0.8},
    form: {marginTop: spacing.xl, gap: spacing.md},
    toggle: {alignSelf: 'flex-end', marginTop: -spacing.xs},
    toggleText: {opacity: 0.82},
    cta: {marginTop: spacing.sm},
    footerRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg},
    link: {opacity: 0.92, fontWeight: '800'},
    dot: {opacity: 0.6},
});
