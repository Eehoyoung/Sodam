import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppInput,
    AppListItem,
    AppText,
    AppToast,
    BottomSheet,
    CtaStack,
    SegmentedControl,
    StepScaffold,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import authApi from '../services/authApi';
import ConsentBlock, {ConsentValue} from '../components/ConsentBlock';
import {unifiedStorage} from '../../../common/utils/unifiedStorage';
import {AuthStackParamList} from '../../../navigation/types';
import {AuthPurpose, purposeLabel, purposeToPendingSlug} from '../../../navigation/authFlow';

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

const PW_POLICY = '8자 이상, 대문자/소문자/숫자/특수문자 중 3가지 이상';

const indexForPurpose = (purpose?: AuthPurpose) => {
    const index = ROLES.findIndex(role => role.id === purpose);
    return index >= 0 ? index : 0;
};

// 위치정보 동의는 필수에서 제외 — 위치정보법 §19②(미동의 이유 서비스 거부 금지).
// GPS 출퇴근을 처음 쓸 때 별도로 동의를 구한다(useLocationConsentGate).
const REQUIRED_CONSENT_KEYS: (keyof ConsentValue)[] = ['age', 'terms', 'privacy'];

/**
 * 회원가입 — v3 아티팩트(sodam-v3-01-auth.html "05 Signup": "회원가입" 헤더 + 틸 "n/3" 배지 +
 * 요약형 동의 행 + CTA "다음")를 기준으로 StepScaffold 3단계 위저드로 재구성했다
 * (1단계 기본정보 → 2단계 약관동의 요약 → 3단계 확인). 제출 로직(authApi.join 호출,
 * 이메일 중복확인, 비밀번호 정책)은 기존 그대로이고 UI 구조만 3단계로 나눴다.
 * 약관 동의는 법적으로 항목별 체크가 필요해 기존 ConsentBlock 전체 UI를 그대로 쓰되,
 * 화면에는 아티팩트처럼 요약 행(제목+상태 배지)만 보여주고 탭하면 BottomSheet로 펼친다.
 */
const SignUpScreen: React.FC<SignupScreenProps> = ({navigation, route}) => {
    const [step, setStep] = useState<0 | 1 | 2>(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roleIndex, setRoleIndex] = useState(() => indexForPurpose(route.params?.selectedPurpose));
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState<string | undefined>();
    const [emailChecking, setEmailChecking] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [checkedEmail, setCheckedEmail] = useState('');
    const [pwError, setPwError] = useState<string | undefined>();
    const [consentSheetOpen, setConsentSheetOpen] = useState(false);
    const [consent, setConsent] = useState<ConsentValue>({
        age: false,
        terms: false,
        privacy: false,
        locationService: false,
        marketing: false,
    });

    useEffect(() => {
        if (route.params?.selectedPurpose) {
            setRoleIndex(indexForPurpose(route.params.selectedPurpose));
        }
    }, [route.params?.selectedPurpose]);

    const role = ROLES[roleIndex];
    const allRequiredConsentChecked = REQUIRED_CONSENT_KEYS.every(k => consent[k]);

    const checkEmailAvailability = async (showToast = false): Promise<boolean> => {
        const normalizedEmail = email.trim().toLowerCase();
        setEmailAvailable(null);
        setCheckedEmail('');

        if (!normalizedEmail) {
            setEmailError('이메일을 입력해 주세요.');
            return false;
        }
        if (!isValidEmail(normalizedEmail)) {
            setEmailError('올바른 이메일 형식으로 입력해 주세요.');
            return false;
        }

        setEmailChecking(true);
        try {
            const {available} = await authApi.checkEmail(normalizedEmail);
            setEmailAvailable(available);
            setCheckedEmail(normalizedEmail);
            setEmailError(available ? undefined : '이미 사용 중인 이메일이에요.');
            if (showToast) {
                if (available) {
                    AppToast.success('사용 가능한 이메일이에요.');
                } else {
                    AppToast.warn('이미 사용 중인 이메일이에요.');
                }
            }
            return available;
        } catch {
            setEmailAvailable(null);
            setEmailError('이메일 중복 확인에 실패했어요. 다시 시도해 주세요.');
            if (showToast) {
                AppToast.error('이메일 중복 확인에 실패했어요.');
            }
            return false;
        } finally {
            setEmailChecking(false);
        }
    };

    const handleEmailBlur = async () => {
        if (email.trim()) {
            await checkEmailAvailability(false);
        }
    };

    // 1단계 → 2단계 게이트: 이름/이메일(중복확인 포함)/비밀번호 정책 — handleSignup 의 검증과
    // 동일 규칙이다(제출 로직은 건드리지 않고 게이트만 앞으로 당겨왔다).
    const validateBasicInfo = async (): Promise<boolean> => {
        if (!name.trim() || !email.trim() || !password) {
            AppToast.show('이름, 이메일, 비밀번호를 모두 입력해 주세요.');
            return false;
        }
        if (name.trim().length < 2) {
            AppToast.warn('이름은 2자 이상 입력해 주세요.');
            return false;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            setEmailError('올바른 이메일 형식으로 입력해 주세요.');
            return false;
        }
        if (emailAvailable !== true || checkedEmail !== normalizedEmail) {
            const available = await checkEmailAvailability(true);
            if (!available) {
                return false;
            }
        }
        if (!isValidPassword(password)) {
            setPwError(`비밀번호: ${PW_POLICY}`);
            return false;
        }
        return true;
    };

    const goToConsentStep = async () => {
        if (await validateBasicInfo()) {
            setStep(1);
        }
    };

    const goToConfirmStep = () => {
        if (!allRequiredConsentChecked) {
            AppToast.warn('서비스 이용을 위해 필수 약관에 동의해 주세요.');
            return;
        }
        setStep(2);
    };

    const handleSignup = async () => {
        if (isLoading) {
            return;
        }
        if (!name.trim() || !email.trim() || !password) {
            AppToast.show('이름, 이메일, 비밀번호를 모두 입력해 주세요.');
            return;
        }
        if (name.trim().length < 2) {
            AppToast.warn('이름은 2자 이상 입력해 주세요.');
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!isValidEmail(normalizedEmail)) {
            setEmailError('올바른 이메일 형식으로 입력해 주세요.');
            return;
        }
        if (emailAvailable !== true || checkedEmail !== normalizedEmail) {
            const available = await checkEmailAvailability(true);
            if (!available) {
                return;
            }
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
                {name: name.trim(), email: normalizedEmail, password},
                {purpose: role.id, userGrade, consent},
            );

            await unifiedStorage.setItem('pendingPurposeAfterSignup', purposeToPendingSlug(role.id));
            AppToast.success('가입이 완료되었습니다. 로그인 후 기본 정보를 설정해 주세요.');
            navigation.navigate('Login', {selectedPurpose: role.id, fromSignup: true});
            setName('');
            setEmail('');
            setPassword('');
            setEmailAvailable(null);
            setCheckedEmail('');
        } catch (e: any) {
            const beMsg = e?.response?.data?.message;
            AppToast.error(beMsg && typeof beMsg === 'string'
                ? beMsg
                : '회원가입에 실패했습니다. 입력값을 확인하고 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 1) {
        return (
            <StepScaffold
                progress={2 / 3}
                title="약관 동의"
                subtitle="필수 약관에 동의하면 다음 단계로 진행할 수 있어요."
                onBack={() => setStep(0)}
                footer={
                    <CtaStack bordered>
                        <AppButton label="다음" onPress={goToConfirmStep} />
                    </CtaStack>
                }>
                <View style={styles.badgeRow}>
                    <AppBadge tone="success" label="2/3" />
                </View>
                <AppListItem
                    title="필수 약관 동의"
                    subtitle="이용약관 · 개인정보 처리방침 · 만 14세 이상"
                    right={
                        <AppBadge
                            tone={allRequiredConsentChecked ? 'success' : 'warning'}
                            label={allRequiredConsentChecked ? '확인' : '미확인'}
                        />
                    }
                    onPress={() => setConsentSheetOpen(true)}
                />
                <AppText variant="caption" tone="tertiary" style={styles.consentHint}>
                    위치기반 서비스·마케팅 정보 수신(선택)도 위 항목을 눌러 함께 설정할 수 있어요.
                </AppText>

                <BottomSheet
                    visible={consentSheetOpen}
                    onClose={() => setConsentSheetOpen(false)}
                    title="약관 동의"
                    scrollable
                    primary={{label: '확인', onPress: () => setConsentSheetOpen(false)}}>
                    <ConsentBlock value={consent} onChange={setConsent} />
                </BottomSheet>
            </StepScaffold>
        );
    }

    if (step === 2) {
        return (
            <StepScaffold
                progress={1}
                title="확인"
                subtitle="입력한 정보로 가입을 완료해요."
                onBack={() => setStep(1)}
                footer={
                    <CtaStack bordered>
                        <AppButton
                            label="가입 완료"
                            loading={isLoading}
                            loadingLabel="가입 중..."
                            onPress={handleSignup}
                        />
                    </CtaStack>
                }>
                <View style={styles.badgeRow}>
                    <AppBadge tone="success" label="3/3" />
                </View>
                <AppCard variant="plain" style={styles.confirmCard}>
                    <ConfirmRow label="역할" value={purposeLabel(role.id)} />
                    <ConfirmRow label="이름" value={name.trim() || '-'} />
                    <ConfirmRow label="이메일" value={email.trim() || '-'} />
                    <ConfirmRow label="약관 동의" value={allRequiredConsentChecked ? '완료' : '미완료'} />
                </AppCard>
            </StepScaffold>
        );
    }

    // step === 0: 기본 정보 — 아티팩트 "05 Signup" 화면과 1:1 (세그먼트 + info-card + 필드 3종)
    return (
        <StepScaffold
            progress={1 / 3}
            title="기본 정보"
            onBack={() => navigation.goBack()}
            footer={
                <CtaStack bordered>
                    <AppButton
                        label="다음"
                        loading={emailChecking}
                        loadingLabel="확인 중..."
                        onPress={goToConsentStep}
                    />
                </CtaStack>
            }>
            <View style={styles.badgeRow}>
                <AppBadge tone="success" label="1/3" />
            </View>
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
                <View style={styles.emailGroup}>
                    <AppInput
                        label="이메일"
                        placeholder="name@example.com"
                        value={email}
                        onChangeText={text => {
                            setEmail(text);
                            setEmailAvailable(null);
                            setCheckedEmail('');
                            if (emailError) {
                                setEmailError(undefined);
                            }
                        }}
                        onBlur={handleEmailBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={emailError}
                        helper={emailChecking ? '확인 중...' : emailAvailable ? '사용 가능한 이메일이에요.' : undefined}
                    />
                    <AppButton
                        label="이메일 중복 확인"
                        variant="outline"
                        size="md"
                        loading={emailChecking}
                        loadingLabel="확인 중..."
                        onPress={() => checkEmailAvailability(true)}
                    />
                </View>
                <AppInput
                    label="비밀번호"
                    placeholder="비밀번호를 입력해 주세요"
                    helper={pwError ? undefined : PW_POLICY}
                    value={password}
                    onChangeText={text => {
                        setPassword(text);
                        if (pwError) {
                            setPwError(undefined);
                        }
                    }}
                    secureTextEntry
                    error={pwError}
                />
            </View>
        </StepScaffold>
    );
};

const ConfirmRow: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.confirmRow}>
        <AppText variant="bodyMd" tone="secondary">{label}</AppText>
        <AppText variant="bodyMd" weight="700" numberOfLines={1} style={styles.confirmValue}>{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    badgeRow: {marginBottom: spacing.md},
    sectionLabel: {marginBottom: spacing.sm},
    hint: {marginTop: spacing.md},
    hintSub: {marginTop: 4},
    form: {marginTop: spacing.xxl, gap: spacing.md},
    emailGroup: {gap: spacing.sm},
    consentHint: {marginTop: spacing.sm, marginLeft: 2},
    confirmCard: {gap: spacing.sm},
    confirmRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        gap: spacing.md,
    },
    confirmValue: {flexShrink: 1, textAlign: 'right'},
});

export default SignUpScreen;
