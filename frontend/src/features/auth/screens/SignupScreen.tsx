import {AppToast} from '../../../common/components/ds';
import React, {useMemo, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import {NavigationProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    CtaStack,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';
import ConsentBlock, {ConsentValue} from '../components/ConsentBlock';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';

interface SignupScreenProps {
    navigation: NavigationProp<any>;
}

type RoleId = 'boss' | 'employee' | 'personal';

// 세그먼트 순서 = 확정 시안 (사장님 · 직원 · 개인)
const ROLES: {id: RoleId; label: string; hint: string}[] = [
    {id: 'boss', label: '사장님', hint: '첫 매장 등록과 직원 초대까지 이어서 도와드려요.'},
    {id: 'employee', label: '직원', hint: '매장 코드로 가입하면 출퇴근과 급여명세를 봐요.'},
    {id: 'personal', label: '개인', hint: '회사 승인 없이 내 근무 시간을 직접 기록해요.'},
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/**
 * 05 Signup — 확정 시안.
 * 라이트 배경 + 역할 세그먼트 + 기본 정보 + 약관 동의. 가입 로직/약관 검증은 보존.
 */
const SignUpScreen: React.FC<SignupScreenProps> = ({navigation}) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleIndex, setRoleIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [pwError, setPwError] = useState<string | undefined>();
    const [consent, setConsent] = useState<ConsentValue>({
        age: false,
        terms: false,
        privacy: false,
        marketing: false,
    });

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
            Alert.alert('약관 동의', '만 14세 이상·이용약관·개인정보 처리방침은 필수 동의 항목이에요.');
            return;
        }

        setIsLoading(true);
        try {
            const userGrade = role.id === 'boss' ? 'MASTER' : role.id === 'employee' ? 'EMPLOYEE' : 'PERSONAL';
            await authApi.join(
                {name, email, password},
                {purpose: role.id as any, userGrade: userGrade as any, consent},
            );

            // 첫 로그인 시 팝업 억제용으로 선택한 목적 로컬 저장
            const purposeSlug = role.id === 'boss' ? 'master' : role.id === 'employee' ? 'employee' : 'user';
            try {
                await unifiedStorage.setItem('pendingPurposeAfterSignup', purposeSlug);
            } catch (_) {/* no-op */}

            Alert.alert('회원가입 완료', '가입이 완료됐어요. 로그인해 주세요.', [
                {text: '확인', onPress: () => navigation.navigate('Login')},
            ]);
            setName('');
            setEmail('');
            setPassword('');
        } catch (e: any) {
            const beMsg = e?.response?.data?.message;
            Alert.alert(
                '회원가입 실패',
                beMsg && typeof beMsg === 'string' ? beMsg : '회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    const footer = useMemo(
        () => (
            <CtaStack bordered>
                <AppButton
                    label="다음"
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
            header={<AppHeader title="회원가입" rightText="1/3" onBack={() => navigation.goBack()} />}
            footer={footer}>
            <SegmentedControl options={ROLES.map(r => r.label)} value={roleIndex} onChange={setRoleIndex} />

            <AppCard variant="warm" style={styles.hint}>
                <AppText variant="titleMd">{role.label}으로 시작하면</AppText>
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
