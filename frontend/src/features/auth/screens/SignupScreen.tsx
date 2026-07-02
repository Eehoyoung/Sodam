import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import SodamLogo from '../../../common/components/logo/SodamLogo';
import {spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';
import ConsentBlock, {ConsentValue} from '../components/ConsentBlock';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {AuthStackParamList} from '../../../navigation/types';
import {AuthPurpose, purposeToPendingSlug, purposeLabel} from '../../../navigation/authFlow';

interface SignupScreenProps {
    navigation: NavigationProp<any>;
    route: RouteProp<AuthStackParamList, 'Signup'>;
}

type RoleId = AuthPurpose;

const ROLES: {id: RoleId; label: string; hint: string}[] = [
    {id: 'boss', label: '사장님', hint: '매장 등록부터 직원 초대까지 이어서 준비할 수 있어요.'},
    {id: 'employee', label: '직원', hint: '매장 코드로 합류하고 출퇴근과 급여명세를 확인해요.'},
    {id: 'personal', label: '개인', hint: '매장 없이 근무 시간과 급여 기록을 직접 관리해요.'},
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidPassword = (pw: string): boolean => {
    if (pw.length < 8) {
        return false;
    }
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length >= 3;
};

const PW_POLICY = '8자 이상, 대문자·소문자·숫자·특수문자 중 3가지 이상';

const indexForPurpose = (purpose?: AuthPurpose) => {
    const index = ROLES.findIndex(role => role.id === purpose);
    return index >= 0 ? index : 0;
};

const SignUpScreen: React.FC<SignupScreenProps> = ({navigation, route}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleIndex, setRoleIndex] = useState(() => indexForPurpose(route.params?.selectedPurpose));
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [emailChecking, setEmailChecking] = useState(false);
    const [pwError, setPwError] = useState<string | undefined>();
    const [consent, setConsent] = useState<ConsentValue>({
        age: false,
        terms: false,
        privacy: false,
        marketing: false,
    });

    useEffect(() => {
        if (route.params?.selectedPurpose) {
            setRoleIndex(indexForPurpose(route.params.selectedPurpose));
        }
    }, [route.params?.selectedPurpose]);

    const role = ROLES[roleIndex];

    const handleEmailBlur = async () => {
        if (!email) {
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('올바른 이메일 주소를 입력해 주세요.');
            return;
        }
        setEmailChecking(true);
        try {
            const {available} = await authApi.checkEmail(email.trim().toLowerCase());
            setEmailError(available ? undefined : '이미 사용 중인 이메일이에요.');
        } catch {
            setEmailError(undefined);
        } finally {
            setEmailChecking(false);
        }
    };

    const handleSignup = async () => {
        if (isLoading) {
            return;
        }
        if (!name.trim() || !email || !password) {
            AppToast.show('이름, 이메일, 비밀번호를 모두 입력해 주세요.');
            return;
        }
        if (name.trim().length < 2) {
            AppToast.warn('이름은 2자 이상 입력해 주세요.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('올바른 이메일 주소를 입력해 주세요.');
            return;
        }
        if (emailError) {
            AppToast.warn(emailError);
            return;
        }
        if (!isValidPassword(password)) {
            setPwError(`비밀번호: ${PW_POLICY}`);
            return;
        }
        if (!consent.age || !consent.terms || !consent.privacy) {
            AppToast.warn('서비스 이용을 위해 필수 약관에 동의해 주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const userGrade = role.id === 'boss' ? 'MASTER' : role.id === 'employee' ? 'EMPLOYEE' : 'PERSONAL';
            await authApi.join(
                {name, email, password},
                {purpose: role.id, userGrade, consent},
            );

            await unifiedStorage.setItem('pendingPurposeAfterSignup', purposeToPendingSlug(role.id));
            AppToast.success('가입이 완료되었습니다. 로그인 후 기본 정보를 설정해 주세요.');
            navigation.navigate('Login', {selectedPurpose: role.id, fromSignup: true});
            setName('');
            setEmail('');
            setPassword('');
        } catch (e: any) {
            const beMsg = e?.response?.data?.message;
            AppToast.error(beMsg && typeof beMsg === 'string'
                ? beMsg
                : '회원가입에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    const footer = useMemo(
        () => (
            <CtaStack bordered>
                <AppButton
                    label="가입 완료"
                    loading={isLoading}
                    loadingLabel="가입 중..."
                    onPress={handleSignup}
                />
            </CtaStack>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isLoading, name, email, password, roleIndex, consent],
    );

    return (
        <ScreenContainer
            scroll
            header={<AppHeader onBack={() => navigation.goBack()} />}
            footer={footer}>
            <View style={styles.logoRow}>
                <SodamLogo size={56} variant="default" />
            </View>
            <AppText variant="headingLg" style={styles.title}>
                {'소담을\n시작할게요'}
            </AppText>

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                어떤 역할인가요?
            </AppText>
            <SegmentedControl options={ROLES.map(r => r.label)} value={roleIndex} onChange={setRoleIndex} />

            <AppCard variant="warm" style={styles.hint}>
                <AppText variant="titleMd">{purposeLabel(role.id)}으로 시작합니다</AppText>
                <AppText variant="caption" tone="secondary" style={styles.hintSub}>
                    {role.hint}
                </AppText>
            </AppCard>

            <View style={styles.form}>
                <AppInput
                    label="이름"
                    placeholder="이름을 입력해 주세요"
                    value={name}
                    onChangeText={setName}
                    helper="실명 또는 닉네임 2자 이상"
                />
                <AppInput
                    label="이메일"
                    placeholder="name@example.com"
                    value={email}
                    onChangeText={t => {
                        setEmail(t);
                        if (emailError) {
                            setEmailError(undefined);
                        }
                    }}
                    onBlur={handleEmailBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                    helper={emailChecking ? '확인 중...' : undefined}
                />
                <AppInput
                    label="비밀번호"
                    placeholder="비밀번호를 입력해 주세요"
                    helper={pwError ? undefined : PW_POLICY}
                    value={password}
                    onChangeText={t => {
                        setPassword(t);
                        if (pwError) {
                            setPwError(undefined);
                        }
                    }}
                    secureTextEntry
                    error={pwError}
                />
            </View>

            <View style={styles.consent}>
                <ConsentBlock value={consent} onChange={setConsent} />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    logoRow: {alignItems: 'center', marginBottom: spacing.lg},
    title: {marginBottom: spacing.xxl},
    sectionLabel: {marginBottom: spacing.sm},
    hint: {marginTop: spacing.md},
    hintSub: {marginTop: 4},
    form: {marginTop: spacing.xxl, gap: spacing.md},
    consent: {marginTop: spacing.xxl},
});

export default SignUpScreen;
