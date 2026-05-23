import React, {useEffect, useRef, useState} from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Button from '../../../common/components/form/Button';
import Input from '../../../common/components/form/Input';
import {
    checkPassword,
    passwordResetApi,
    PasswordStrength,
} from '../services/passwordResetApi';

type Step = 'EMAIL' | 'OTP' | 'NEW_PWD' | 'DONE';

const OTP_LENGTH = 6;
const OTP_VALID_SECONDS = 300;

/**
 * 비밀번호 재설정 (G-006) — 단일 화면 3 step.
 * 이메일 → OTP → 새 비번 → 완료.
 */
const PasswordResetScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const [step, setStep] = useState<Step>('EMAIL');

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <ProgressBar step={step} />
                    {step === 'EMAIL' && <StepEmail onNext={() => setStep('OTP')} />}
                    {step === 'OTP' && <StepOtp onNext={() => setStep('NEW_PWD')} onBack={() => setStep('EMAIL')} />}
                    {step === 'NEW_PWD' && <StepNewPassword onDone={() => setStep('DONE')} />}
                    {step === 'DONE' && (
                        <DoneCard onClose={() => navigation.navigate('Login' as never)} />
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const ProgressBar: React.FC<{step: Step}> = ({step}) => {
    const idx = step === 'EMAIL' ? 0 : step === 'OTP' ? 1 : step === 'NEW_PWD' ? 2 : 3;
    return (
        <View style={styles.progressRow}>
            {['이메일', '인증번호', '새 비밀번호'].map((label, i) => (
                <View key={label} style={styles.progressItem}>
                    <View
                        style={[
                            styles.progressDot,
                            i < idx && styles.progressDotDone,
                            i === idx && styles.progressDotActive,
                            i > idx && styles.progressDotIdle,
                        ]}
                    >
                        <Text style={[
                            styles.progressDotText,
                            i <= idx ? styles.progressDotTextActive : styles.progressDotTextIdle,
                        ]}>
                            {i + 1}
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.progressLabel,
                            i === idx && {color: tokens.colors.brandPrimary, fontWeight: '700'},
                        ]}
                    >
                        {label}
                    </Text>
                </View>
            ))}
        </View>
    );
};

// ───── Step 1: 이메일 입력 ─────
const StepEmail: React.FC<{onNext: () => void}> = ({onNext}) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email || !email.includes('@')) {
            Alert.alert('확인 필요', '올바른 이메일 형식을 입력해 주세요.');
            return;
        }
        setLoading(true);
        try {
            await passwordResetApi.request(email);
            // 응답은 항상 동일 (account enumeration 방지)
            globalEmailRef.current = email;
            onNext();
        } catch (e: any) {
            Alert.alert('잠시 후 다시 시도해 주세요', '서버 응답이 없어요. 우리 잘못이에요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            <Text style={styles.title}>비밀번호 찾기</Text>
            <Text style={styles.subtitle}>
                가입하신 이메일로 6자리 인증번호를 보내드릴게요.
            </Text>
            <Input
                label="이메일"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
            />
            <Button
                title="인증번호 받기"
                onPress={submit}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
            />
        </View>
    );
};

const globalEmailRef = {current: ''};

// ───── Step 2: OTP 입력 ─────
const StepOtp: React.FC<{onNext: () => void; onBack: () => void}> = ({onNext, onBack}) => {
    const [code, setCode] = useState('');
    const [remaining, setRemaining] = useState(OTP_VALID_SECONDS);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 250);
        return () => clearTimeout(t);
    }, []);

    const resend = async () => {
        setRemaining(OTP_VALID_SECONDS);
        await passwordResetApi.request(globalEmailRef.current);
        Alert.alert('알림', '인증번호를 다시 보냈어요.');
    };

    const submit = async () => {
        if (code.length !== OTP_LENGTH) return;
        setLoading(true);
        try {
            const ticket = await passwordResetApi.verify(globalEmailRef.current, code);
            globalTicketRef.current = ticket;
            onNext();
        } catch (e: any) {
            Alert.alert(
                '인증 실패',
                '인증번호가 일치하지 않거나 만료되었어요. 다시 확인해 주세요.',
            );
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
    const secs = String(remaining % 60).padStart(2, '0');

    return (
        <View>
            <Text style={styles.title}>인증번호 확인</Text>
            <Text style={styles.subtitle}>
                {maskEmail(globalEmailRef.current)} 으로 발송된{'\n'}
                6자리 인증번호를 입력해 주세요.
            </Text>

            <Pressable onPress={() => inputRef.current?.focus()}>
                <View style={styles.otpRow}>
                    {Array.from({length: OTP_LENGTH}).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.otpBox,
                                code.length === i && styles.otpBoxActive,
                            ]}
                        >
                            <Text style={styles.otpDigit}>{code[i] ?? ''}</Text>
                        </View>
                    ))}
                </View>
            </Pressable>

            <TextInput
                ref={inputRef}
                value={code}
                onChangeText={v => setCode(v.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={styles.hiddenInput}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
            />

            <Text style={styles.timer}>
                {remaining > 0 ? `⏱ ${mins}:${secs} 남음` : '⚠️ 인증번호가 만료되었어요'}
            </Text>

            <Button
                title="인증 확인"
                onPress={submit}
                variant="primary"
                size="lg"
                fullWidth
                disabled={code.length !== OTP_LENGTH || remaining <= 0}
                loading={loading}
            />
            <Button
                title={remaining > 0 ? '잠시 후 재발송 가능' : '인증번호 다시 받기'}
                onPress={resend}
                variant="ghost"
                size="md"
                fullWidth
                disabled={remaining > OTP_VALID_SECONDS - 60}
            />
            <Pressable onPress={onBack} style={({pressed}) => [styles.backRow, pressed && {opacity: 0.5}]}>
                <Text style={styles.backText}>← 이메일 다시 입력</Text>
            </Pressable>
        </View>
    );
};

const globalTicketRef = {current: ''};

// ───── Step 3: 새 비밀번호 ─────
const StepNewPassword: React.FC<{onDone: () => void}> = ({onDone}) => {
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const check = checkPassword(pw);

    const submit = async () => {
        if (!check.isValid) {
            Alert.alert('확인 필요', '비밀번호 규칙을 모두 만족해야 해요.');
            return;
        }
        if (pw !== confirm) {
            Alert.alert('확인 필요', '비밀번호가 일치하지 않아요.');
            return;
        }
        setLoading(true);
        try {
            await passwordResetApi.confirm(globalTicketRef.current, pw);
            onDone();
        } catch (e: any) {
            Alert.alert('실패', '비밀번호 변경에 실패했어요. 처음부터 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            <Text style={styles.title}>새 비밀번호 설정</Text>
            <Text style={styles.subtitle}>안전한 비밀번호를 만들어 주세요.</Text>

            <Input
                label="새 비밀번호"
                value={pw}
                onChangeText={setPw}
                secureTextEntry
                editable={!loading}
                helperText={`강도: ${strengthLabel(check.strength)}`}
            />
            <StrengthBar strength={check.strength} />

            <Input
                label="비밀번호 확인"
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                editable={!loading}
                error={confirm && pw !== confirm ? '비밀번호가 일치하지 않아요' : undefined}
            />

            <View style={styles.checkList}>
                <CheckItem ok={check.hasLength} text="8자 이상" />
                <CheckItem ok={check.hasUpper && check.hasLower} text="대소문자 포함" />
                <CheckItem ok={check.hasDigit} text="숫자 포함" />
                <CheckItem ok={check.hasSpecial} text="특수문자 포함" />
            </View>

            <Button
                title="비밀번호 변경하기"
                onPress={submit}
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={!check.isValid || pw !== confirm}
            />
        </View>
    );
};

const DoneCard: React.FC<{onClose: () => void}> = ({onClose}) => (
    <View style={styles.doneBox}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.title}>비밀번호가 변경되었어요</Text>
        <Text style={styles.subtitle}>새 비밀번호로 다시 로그인해 주세요.</Text>
        <Button title="로그인하러 가기" onPress={onClose} variant="primary" size="lg" fullWidth />
    </View>
);

const StrengthBar: React.FC<{strength: PasswordStrength}> = ({strength}) => {
    const map: Record<PasswordStrength, {fill: `${number}%`; color: string}> = {
        weak: {fill: '33%', color: tokens.colors.error},
        medium: {fill: '66%', color: tokens.colors.warning},
        strong: {fill: '100%', color: tokens.colors.success},
    };
    return (
        <View style={styles.strengthTrack}>
            <View
                style={[
                    styles.strengthFill,
                    {width: map[strength].fill, backgroundColor: map[strength].color},
                ]}
            />
        </View>
    );
};

const CheckItem: React.FC<{ok: boolean; text: string}> = ({ok, text}) => (
    <View style={styles.checkRow}>
        <Text style={[styles.checkIcon, ok && styles.checkIconOk]}>{ok ? '✓' : '○'}</Text>
        <Text style={[styles.checkText, ok && styles.checkTextOk]}>{text}</Text>
    </View>
);

function strengthLabel(s: PasswordStrength): string {
    return s === 'weak' ? '약함' : s === 'medium' ? '보통' : '강함';
}

function maskEmail(email: string): string {
    if (!email) return '';
    const at = email.indexOf('@');
    if (at <= 1) return '***';
    return email[0] + '***' + email.substring(at);
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    flex: {flex: 1},
    scrollContent: {
        padding: tokens.spacing.lg,
        paddingBottom: tokens.spacing.huge,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: tokens.spacing.xxl,
        marginTop: tokens.spacing.md,
    },
    progressItem: {alignItems: 'center', flex: 1},
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: tokens.spacing.xs,
    },
    progressDotIdle: {backgroundColor: tokens.colors.surfaceMuted},
    progressDotActive: {backgroundColor: tokens.colors.brandPrimary},
    progressDotDone: {backgroundColor: tokens.colors.success},
    progressDotText: {fontSize: 14, fontWeight: '700'},
    progressDotTextActive: {color: tokens.colors.textInverse},
    progressDotTextIdle: {color: tokens.colors.textTertiary},
    progressLabel: {
        fontSize: tokens.typography.sizes.xs,
        color: tokens.colors.textSecondary,
    },
    title: {
        fontSize: tokens.typography.sizes.xxl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.5,
        marginBottom: tokens.spacing.sm,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.md,
        color: tokens.colors.textSecondary,
        marginBottom: tokens.spacing.xl,
        lineHeight: 22,
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: tokens.spacing.md,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderWidth: 1.5,
        borderColor: tokens.colors.border,
        borderRadius: tokens.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.colors.surface,
    },
    otpBoxActive: {borderColor: tokens.colors.brandPrimary, borderWidth: 2},
    otpDigit: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        height: 1,
        width: 1,
    },
    timer: {
        textAlign: 'center',
        color: tokens.colors.warning,
        fontVariant: ['tabular-nums'],
        marginBottom: tokens.spacing.lg,
    },
    backRow: {alignItems: 'center', paddingVertical: tokens.spacing.md},
    backText: {color: tokens.colors.textSecondary, fontSize: tokens.typography.sizes.sm},
    strengthTrack: {
        height: 6,
        backgroundColor: tokens.colors.surfaceMuted,
        borderRadius: tokens.radius.pill,
        marginTop: -tokens.spacing.sm,
        marginBottom: tokens.spacing.md,
        overflow: 'hidden',
    },
    strengthFill: {height: '100%', borderRadius: tokens.radius.pill},
    checkList: {gap: tokens.spacing.xs, marginVertical: tokens.spacing.md},
    checkRow: {flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm},
    checkIcon: {
        width: 18,
        textAlign: 'center',
        color: tokens.colors.textTertiary,
        fontSize: 14,
    },
    checkIconOk: {color: tokens.colors.success},
    checkText: {color: tokens.colors.textTertiary, fontSize: tokens.typography.sizes.sm},
    checkTextOk: {color: tokens.colors.textPrimary},
    doneBox: {alignItems: 'center', paddingTop: tokens.spacing.huge},
    doneEmoji: {fontSize: 64, marginBottom: tokens.spacing.lg},
});

export default PasswordResetScreen;
