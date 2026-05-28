import {AppToast} from '../../../common/components/ds';
import React, {useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NavigationProp} from '@react-navigation/native';
import {AppButton, AppInput, AppText, Brandmark} from '../../../common/components/ds';
import {colors, gradient, spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';
import {useAuth} from '../../../contexts/AuthContext';
import PurposeSelectModal, {Purpose} from '../components/PurposeSelectModal';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {normalizeUserGrade} from '../utils/grade';

interface LoginScreenProps {
    navigation: NavigationProp<any>;
}

type MyPageTarget = 'UserMyPageScreen' | 'EmployeeMyPageScreen' | 'MasterMyPageScreen';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * 04 Login — 확정 시안.
 * 다크 배경 + 히어로 카피 + 이메일/비밀번호 + 카카오. 로그인 로직/라우팅은 보존.
 */
export default function LoginScreen({navigation}: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [purposeModalVisible, setPurposeModalVisible] = useState(false);
    const [pendingUserId] = useState<number | null>(null);

    const {login: authLogin} = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            AppToast.error('이메일과 비밀번호를 입력해 주세요.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('올바른 이메일 형식을 입력해 주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const loggedInUser = await authLogin(email, password);
            const grade = normalizeUserGrade((loggedInUser?.role as any) ?? undefined);
            let targetScreen: MyPageTarget = 'UserMyPageScreen';
            if (grade === 'EMPLOYEE') {
                targetScreen = 'EmployeeMyPageScreen';
            } else if (grade === 'MASTER') {
                targetScreen = 'MasterMyPageScreen';
            }

            const userId = (loggedInUser?.id as unknown as number) ?? null;

            // 1) 가입 시 선택한 사용 목적 자동 적용 (email/password 흐름)
            try {
                const pending = await unifiedStorage.getItem('pendingPurposeAfterSignup');
                if (pending && userId) {
                    const mappedPurpose: Purpose =
                        pending === 'master' ? 'boss' : pending === 'employee' ? 'employee' : 'personal';
                    try {
                        await authApi.setPurpose(userId, mappedPurpose);
                    } catch (_) {/* backend may not be ready */}
                    try {
                        await unifiedStorage.removeItem('pendingPurposeAfterSignup');
                    } catch (_) {/* ignore */}

                    const target: MyPageTarget =
                        mappedPurpose === 'boss'
                            ? 'MasterMyPageScreen'
                            : mappedPurpose === 'employee'
                                ? 'EmployeeMyPageScreen'
                                : 'UserMyPageScreen';

                    Alert.alert('성공', '로그인 성공!', [
                        {
                            text: '확인',
                            onPress: () =>
                                navigation.reset({
                                    index: 0,
                                    routes: [{name: 'HomeRoot' as never, params: {screen: target} as never}] as any,
                                }),
                        },
                    ]);
                    return;
                }
            } catch (_) {/* ignore */}

            // 2) 이메일/비밀번호 로그인은 팝업 없이 항상 등급으로 라우팅
            Alert.alert('성공', '로그인 성공!', [
                {
                    text: '확인',
                    onPress: () =>
                        navigation.reset({
                            index: 0,
                            routes: [{name: 'HomeRoot' as never, params: {screen: targetScreen} as never}] as any,
                        }),
                },
            ]);
        } catch (error) {
            AppToast.error('로그인에 실패했어요. 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKakao = async () => {
        try {
            await authApi.openKakaoLogin();
        } catch (e) {
            AppToast.error('카카오 로그인 페이지를 여는 데 실패했어요.');
        }
    };

    const handlePurposeSelect = async (purpose: Purpose) => {
        const userId = pendingUserId;
        const chosenGrade = purpose === 'boss' ? 'MASTER' : purpose === 'employee' ? 'EMPLOYEE' : 'NORMAL';
        if (userId) {
            try {
                await authApi.setPurpose(userId, purpose);
            } catch (_) {/* 서버 미구현 가능 */}
            try {
                await unifiedStorage.setItem(`purpose_selected_${userId}`, 'true');
            } catch (_) {/* ignore */}
        }
        const target: MyPageTarget =
            chosenGrade === 'MASTER'
                ? 'MasterMyPageScreen'
                : chosenGrade === 'EMPLOYEE'
                    ? 'EmployeeMyPageScreen'
                    : 'UserMyPageScreen';
        setPurposeModalVisible(false);
        Alert.alert('완료', '사용 목적이 설정됐어요.', [
            {
                text: '확인',
                onPress: () =>
                    navigation.reset({
                        index: 0,
                        routes: [{name: 'HomeRoot' as never, params: {screen: target} as never}] as any,
                    }),
            },
        ]);
    };

    return (
        <LinearGradient colors={gradient.darkScreen} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.flex}>
            <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
                <ScrollGuard>
                    <Brandmark size={56} />
                    <AppText variant="headingLg" tone="inverse" style={styles.title}>
                        {'다시 오셨네요.\n바로 시작해요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.copy}>
                        매장 상태와 내 근무 기록을 이어서 확인합니다.
                    </AppText>

                    <View style={styles.form}>
                        <AppInput
                            placeholder="이메일"
                            value={email}
                            onChangeText={t => {
                                setEmail(t);
                                if (emailError) {
                                    setEmailError(undefined);
                                }
                            }}
                            onBlur={() => setEmailError(email && !isValidEmail(email) ? '올바른 이메일 형식을 입력해 주세요.' : undefined)}
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
                        <Pressable onPress={() => navigation.navigate('Signup')} hitSlop={8}>
                            <AppText variant="caption" tone="inverse" style={styles.link}>회원가입</AppText>
                        </Pressable>
                    </View>
                </ScrollGuard>

                <PurposeSelectModal
                    visible={purposeModalVisible}
                    onClose={() => setPurposeModalVisible(false)}
                    onSelectPurpose={handlePurposeSelect}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}

/** 키보드 회피 + 스크롤 (다크 화면 전용 경량 래퍼) */
const ScrollGuard: React.FC<{children: React.ReactNode}> = ({children}) => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
            contentContainerStyle={styles.scroll}
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
