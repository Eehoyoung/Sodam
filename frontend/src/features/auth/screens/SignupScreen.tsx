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
    {id: 'boss', label: '사장님', hint: '매장 등록과 직원 초대까지 이어서 준비할 수 있어요.'},
    {id: 'employee', label: '직원', hint: '매장 코드로 합류하고 출퇴근과 급여명세를 확인해요.'},
    {id: 'personal', label: '개인', hint: '매장 없이 근무 시간과 급여 기록을 직접 관리해요.'},
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

    const handleSignup = async () => {
        if (isLoading) {
            return;
        }
        if (!name || !email || !password) {
            AppToast.show('이름, 이메일, 비밀번호를 모두 입력해 주세요.');
            return;
        }
        if (!isValidEmail(email)) {
            setEmailError('올바른 이메일 주소를 입력해 주세요.');
            return;
        }
        if (password.length < 8) {
            setPwError('비밀번호는 8자 이상이어야 해요.');
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
            AppToast.success('가입이 완료되었습니다. 로그인 후 약관과 기본 정보를 마저 설정해 주세요.');
            navigation.navigate('Login', {selectedPurpose: role.id, fromSignup: true});
            setName('');
            setEmail('');
            setPassword('');
        } catch (e: any) {
            const beMsg = e?.response?.data?.message;
            AppToast.error(beMsg && typeof beMsg === 'string' ? beMsg : '회원가입에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요.');
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
            header={<AppHeader title="회원가입" onBack={() => navigation.goBack()} />}
            footer={footer}>
            <SegmentedControl options={ROLES.map(r => r.label)} value={roleIndex} onChange={setRoleIndex} />

            <AppCard variant="warm" style={styles.hint}>
                <AppText variant="titleMd">{purposeLabel(role.id)}으로 시작합니다</AppText>
                <AppText variant="caption" tone="secondary" style={styles.hintSub}>
                    {role.hint}
                </AppText>
            </AppCard>

            <View style={styles.form}>
                <AppInput label="이름" placeholder="이름을 입력해 주세요" value={name} onChangeText={setName} />
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
                    onBlur={() => setEmailError(email && !isValidEmail(email) ? '올바른 이메일 주소를 입력해 주세요.' : undefined)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={emailError}
                />
                <AppInput
                    label="비밀번호"
                    placeholder="8자 이상 입력"
                    helper={pwError ? undefined : '8자 이상 입력해 주세요.'}
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
    hint: {marginTop: spacing.md},
    hintSub: {marginTop: 4},
    form: {marginTop: spacing.md, gap: spacing.md},
    consent: {marginTop: spacing.lg},
});

export default SignUpScreen;
