/* eslint-disable react-native/no-unused-styles -- styles built via makeStyles(theme) factory; the rule cannot statically track factory-created stylesheets and flags every (used) entry as unused */
import {AppToast, AppButton, AppHeader, AppInput, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AuthStackParamList} from '../../../navigation/types';
import {tokens} from '../../../theme/tokens';
import {useThemeColors, ThemeColors} from '../../../common/hooks/useThemeColors';
import {
    checkPassword,
    passwordResetApi,
    PasswordStrength,
} from '../services/passwordResetApi';

// 기존 다단계 본문을 유지하기 위한 경량 어댑터 (구식 Button/Input → DS)
const Button: React.FC<any> = ({title, size: _size, fullWidth: _fullWidth, textStyle: _textStyle, ...rest}) => (
    <AppButton label={title} {...rest} />
);
const Input: React.FC<any> = ({helperText, ...rest}) => <AppInput helper={helperText} {...rest} />;

type Step = 'EMAIL' | 'OTP' | 'NEW_PWD' | 'DONE';

const OTP_LENGTH = 6;
const OTP_VALID_SECONDS = 300;

/**
 * 비밀번호 재설정 (G-006) — 단일 화면 3 step.
 * 이메일 → OTP → 새 비번 → 완료.
 */
const useStyles = () => {
    const c = useThemeColors();
    return useMemo(() => makeStyles(c), [c]);
};

const PasswordResetScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const c = useThemeColors();
    const [step, setStep] = useState<Step>('EMAIL');

    return (
        <ScreenContainer
            scroll
            backgroundColor={c.background}
            header={<AppHeader title="비밀번호 찾기" onBack={() => navigation.goBack()} />}>
            <ProgressBar step={step} />
            {step === 'EMAIL' && <StepEmail onNext={() => setStep('OTP')} />}
            {step === 'OTP' && <StepOtp onNext={() => setStep('NEW_PWD')} onBack={() => setStep('EMAIL')} />}
            {step === 'NEW_PWD' && <StepNewPassword onDone={() => setStep('DONE')} />}
            {step === 'DONE' && <DoneCard onClose={() => navigation.navigate('Login')} />}
        </ScreenContainer>
    );
};

const ProgressBar: React.FC<{step: Step}> = ({step}) => {
    const styles = useStyles();
    const c = useThemeColors();
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
                            i === idx && {color: c.brandPrimary, fontWeight: '700'},
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
    const styles = useStyles();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email?.includes('@')) {
            AppToast.warn('올바른 이메일 형식을 입력해 주세요.');
            return;
        }
        setLoading(true);
        try {
            await passwordResetApi.request(email);
            // 응답은 항상 동일 (account enumeration 방지)
            globalEmailRef.current = email;
            onNext();
        } catch (e: any) {
            AppToast.error('서버 응답이 없어요. 잠시 후 다시 시도해 주세요.');
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
    const styles = useStyles();
    const c = useThemeColors();
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
        AppToast.show('인증번호를 다시 보냈어요.');
    };

    const submit = async () => {
        if (code.length !== OTP_LENGTH) {return;}
        setLoading(true);
        try {
            const ticket = await passwordResetApi.verify(globalEmailRef.current, code);
            globalTicketRef.current = ticket;
            onNext();
        } catch (e: any) {
            AppToast.warn('인증번호가 일치하지 않거나 만료됐어요. 다시 확인해 주세요.');
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

            <View style={styles.timerRow}>
                <Ionicons
                    name={remaining > 0 ? 'time-outline' : 'alert-circle-outline'}
                    size={16}
                    color={remaining > 0 ? c.warning : c.error}
                />
                <Text style={[styles.timer, remaining <= 0 && {color: c.error}]}>
                    {remaining > 0 ? `${mins}:${secs} 남음` : '인증번호가 만료되었어요'}
                </Text>
            </View>

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
                <Ionicons name="chevron-back" size={15} color={c.textSecondary} />
                <Text style={styles.backText}>이메일 다시 입력</Text>
            </Pressable>
        </View>
    );
};

const globalTicketRef = {current: ''};

// ───── Step 3: 새 비밀번호 ─────
const StepNewPassword: React.FC<{onDone: () => void}> = ({onDone}) => {
    const styles = useStyles();
    const [pw, setPw] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const check = checkPassword(pw);

    const submit = async () => {
        if (!check.isValid) {
            AppToast.warn('비밀번호 규칙을 모두 만족해야 해요.');
            return;
        }
        if (pw !== confirm) {
            AppToast.warn('비밀번호가 일치하지 않아요.');
            return;
        }
        setLoading(true);
        try {
            await passwordResetApi.confirm(globalTicketRef.current, pw);
            onDone();
        } catch (e: any) {
            AppToast.error('비밀번호 변경에 실패했어요. 처음부터 다시 시도해 주세요.');
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

const DoneCard: React.FC<{onClose: () => void}> = ({onClose}) => {
    const styles = useStyles();
    const c = useThemeColors();
    return (
        <View style={styles.doneBox}>
            <View style={styles.doneMark}>
                <Ionicons name="checkmark" size={36} color={c.textInverse} />
            </View>
            <Text style={styles.title}>비밀번호가 변경됐어요</Text>
            <Text style={styles.subtitle}>새 비밀번호로 다시 로그인해 주세요.</Text>
            <Button title="로그인하러 가기" onPress={onClose} variant="primary" size="lg" fullWidth />
        </View>
    );
};

const StrengthBar: React.FC<{strength: PasswordStrength}> = ({strength}) => {
    const styles = useStyles();
    const c = useThemeColors();
    const map: Record<PasswordStrength, {fill: `${number}%`; color: string}> = {
        weak: {fill: '33%', color: c.error},
        medium: {fill: '66%', color: c.warning},
        strong: {fill: '100%', color: c.success},
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

const CheckItem: React.FC<{ok: boolean; text: string}> = ({ok, text}) => {
    const styles = useStyles();
    const c = useThemeColors();
    return (
        <View style={styles.checkRow}>
            <Ionicons
                name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={ok ? c.success : c.textTertiary}
            />
            <Text style={[styles.checkText, ok && styles.checkTextOk]}>{text}</Text>
        </View>
    );
};

function strengthLabel(s: PasswordStrength): string {
    return s === 'weak' ? '약함' : s === 'medium' ? '보통' : '강함';
}

function maskEmail(email: string): string {
    if (!email) {return '';}
    const at = email.indexOf('@');
    if (at <= 1) {return '***';}
    return email[0] + '***' + email.substring(at);
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
    progressRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-around' as const,
        marginBottom: tokens.spacing.xxl,
        marginTop: tokens.spacing.md,
    },
    progressItem: {alignItems: 'center' as const, flex: 1},
    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginBottom: tokens.spacing.xs,
    },
    progressDotIdle: {backgroundColor: c.surfaceMuted},
    progressDotActive: {backgroundColor: c.brandPrimary},
    progressDotDone: {backgroundColor: c.success},
    progressDotText: {fontSize: 14, fontWeight: '700' as const},
    progressDotTextActive: {color: c.textInverse},
    progressDotTextIdle: {color: c.textTertiary},
    progressLabel: {
        fontSize: tokens.typography.sizes.xs,
        color: c.textSecondary,
    },
    title: {
        fontSize: 28,
        lineHeight: 36,
        fontWeight: '800' as const,
        color: c.textPrimary,
        letterSpacing: -0.8,
        marginBottom: tokens.spacing.sm,
    },
    subtitle: {
        fontSize: tokens.typography.sizes.lg,
        color: c.textSecondary,
        marginBottom: tokens.spacing.xl,
        lineHeight: 26,
    },
    otpRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: tokens.spacing.md,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderWidth: 1.5,
        borderColor: c.border,
        borderRadius: tokens.radius.lg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: c.surface,
    },
    otpBoxActive: {borderColor: c.brandPrimary, borderWidth: 2},
    otpDigit: {
        fontSize: tokens.typography.sizes.xl,
        fontWeight: tokens.typography.weights.bold,
        color: c.textPrimary,
    },
    hiddenInput: {
        position: 'absolute' as const,
        opacity: 0,
        height: 1,
        width: 1,
    },
    timerRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: tokens.spacing.xs,
        marginBottom: tokens.spacing.lg,
    },
    timer: {
        textAlign: 'center' as const,
        color: c.warning,
        fontVariant: ['tabular-nums' as const],
    },
    backRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: tokens.spacing.xs,
        paddingVertical: tokens.spacing.md,
    },
    backText: {color: c.textSecondary, fontSize: tokens.typography.sizes.sm},
    strengthTrack: {
        height: 6,
        backgroundColor: c.surfaceMuted,
        borderRadius: tokens.radius.pill,
        marginTop: -tokens.spacing.sm,
        marginBottom: tokens.spacing.md,
        overflow: 'hidden' as const,
    },
    strengthFill: {height: '100%' as const, borderRadius: tokens.radius.pill},
    checkList: {gap: tokens.spacing.xs, marginVertical: tokens.spacing.md},
    checkRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: tokens.spacing.sm},
    checkText: {color: c.textTertiary, fontSize: tokens.typography.sizes.sm},
    checkTextOk: {color: c.textPrimary},
    doneBox: {alignItems: 'center' as const, paddingTop: tokens.spacing.huge},
    doneMark: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: c.success,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginBottom: tokens.spacing.lg,
    },
});

export default PasswordResetScreen;
