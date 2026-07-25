/* eslint-disable react-native/no-color-literals -- 다크 인트로 톤(Splash/RoleStart/KakaoLogin과 동일 계열) 고정 필드 오버레이 색상. */
import React, {useState} from 'react';
import {
    KeyboardAvoidingView,
    KeyboardTypeOptions,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {AppButton, AppText, AppToast} from '../../../common/components/ds';
import {AppleSignInCancelledError, requestAppleIdentityToken} from '../native/appleSignIn';
import {gradient, spacing} from '../../../theme/tokens';
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
 * DarkField — 로그인 화면 전용 다크 필드(아티팩트 04 Login `.field--dark` 1:1).
 * 공용 AppInput은 테마 토큰(useThemeColors)을 그대로 써서 라이트 배경 전제라, 이 화면만
 * 강제로 다크 그라디언트 위에 얹으려면 필드 배경/보더/텍스트색을 직접 오버라이드해야 한다.
 * 공용 컴포넌트를 건드리지 않고 이 화면 로컬로만 존재 — 다른 화면에 영향 없음.
 */
interface DarkFieldProps {
    label: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    onBlur?: () => void;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    error?: string;
}

const DarkField: React.FC<DarkFieldProps> = ({
    label,
    placeholder,
    value,
    onChangeText,
    onBlur,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    error,
}) => (
    <View style={styles.darkFieldContainer}>
        <AppText variant="caption" tone="inverse" weight="700" style={styles.darkLabel}>
            {label}
        </AppText>
        <View style={[styles.darkField, error ? styles.darkFieldErrorBorder : null]}>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                onBlur={onBlur}
                placeholder={placeholder}
                placeholderTextColor="rgba(245,243,239,0.4)"
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                autoCorrect={autoCorrect}
                style={styles.darkInput}
            />
        </View>
        {error ? (
            <AppText variant="caption" style={styles.darkErrorText}>{error}</AppText>
        ) : null}
    </View>
);

/**
 * 로그인 — v3 아티팩트(sodam-v3-01-auth.html "04 Login")와 동일한 다크 인트로 톤
 * (gradient.darkScreen, Splash/RoleStart/WelcomeMain/KakaoLogin과 동일 계열) + 다크 필드.
 * 네비 헤더는 끄고(headerShown:false, AuthNavigator 참고) 큰 마스코트 로고 하나만
 * 브랜드 신호로 남긴다(작은 네비 로고와 중복되지 않도록). 뒤로가기는 하드웨어 back/
 * 스와이프 제스처로 충분 — 별도 버튼 불필요.
 */
export default function LoginScreen({navigation, route}: LoginScreenProps) {
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
            const identityToken = await requestAppleIdentityToken();
            const loggedInUser = await appleLogin(identityToken);
            const fallbackPurpose = await consumePendingPurpose(loggedInUser);
            const nextRoute = resolvePostAuthRoute(loggedInUser, fallbackPurpose);
            AppToast.success('Apple 계정으로 로그인되었습니다.');
            resetToRootRoute(navigation, nextRoute);
        } catch (error: any) {
            // 사용자가 시트를 닫은 취소는 실패로 취급하지 않고 조용히 무시한다.
            if (!(error instanceof AppleSignInCancelledError)) {
                AppToast.error('Apple 로그인에 실패했습니다. 다시 시도해 주세요.');
            }
        } finally {
            setIsAppleLoading(false);
        }
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <ScrollView
                        contentContainerStyle={[styles.scroll, {paddingTop: scrollPadTop}]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <View style={styles.hero}>
                            <SodamLogo size={logoSize} variant="default" />
                            <AppText variant="headingLg" tone="inverse" style={[styles.title, {marginTop: titleMargin}]}>
                                {'다시 오셨네요.\n바로 시작해요'}
                            </AppText>
                            <AppText variant="bodyLg" tone="inverse" style={styles.copy}>
                                {route.params?.fromSignup
                                    ? '로그인하면 약관 동의와 기본 정보 설정을 이어서 진행해요.'
                                    : '로그인 후 남은 설정이 있으면 먼저 안내해 드릴게요.'}
                            </AppText>
                        </View>

                        <View style={[styles.form, {marginTop: formMargin, gap: formGap}]}>
                            <DarkField
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
                            <DarkField
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
                            <AppButton label="카카오로 계속" variant="kakao" onPress={handleKakao} />
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
                            {/* 아티팩트 04 Login .footlink--dark: 전체 한 줄, <b> 미사용 — 균일한 muted 톤(0.65) */}
                            <Pressable onPress={() => navigation.navigate('PasswordReset')} hitSlop={8}>
                                <AppText variant="caption" tone="inverse" style={styles.link}>비밀번호 찾기</AppText>
                            </Pressable>
                            <AppText variant="caption" tone="inverse" style={styles.link}> · </AppText>
                            <Pressable onPress={() => navigation.navigate('Signup', {selectedPurpose})} hitSlop={8}>
                                <AppText variant="caption" tone="inverse" style={styles.link}>회원가입</AppText>
                            </Pressable>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    scroll: {flexGrow: 1, paddingHorizontal: spacing.xxl, paddingBottom: spacing.xl},
    hero: {alignItems: 'center'},
    title: {textAlign: 'center', letterSpacing: -0.6},
    copy: {marginTop: spacing.md, textAlign: 'center', opacity: 0.72},
    form: {marginTop: spacing.xl},
    toggle: {alignSelf: 'flex-end', marginTop: -spacing.xs},
    cta: {marginTop: spacing.sm},
    footerRow: {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg},
    // 아티팩트 .footlink--dark: color rgba(245,243,239,.65), font-weight 미지정(기본 400)
    link: {opacity: 0.65},
    // 아티팩트 .field--dark: border rgba(245,243,239,.22) · bg rgba(255,255,255,.06) · text rgba(245,243,239,.7)
    darkFieldContainer: {gap: spacing.xs},
    darkLabel: {opacity: 0.75, marginLeft: 2},
    darkField: {
        minHeight: 48,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(245,243,239,0.22)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        justifyContent: 'center',
        paddingHorizontal: spacing.md + 2,
    },
    darkFieldErrorBorder: {borderColor: '#FF7288'},
    darkInput: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(245,243,239,0.9)',
        padding: 0,
    },
    darkErrorText: {color: '#FF9BAC', marginLeft: 2},
});
