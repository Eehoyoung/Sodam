import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NavigationProp, useNavigation} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import userService from '../services/userService';

interface Props {
    navigation: NavigationProp<any>;
}

/**
 * 05a ProfileBasics — 회원가입 직후 1회성 보강 화면.
 *
 * 흐름:
 *   회원가입 → 로그인 → (profileCompleted=false 면) 본 화면 강제 진입
 *   휴대폰(필수) + 이름 확정(prefilled) + 생년월일(선택) 한 번에 저장
 *   PUT /api/user/me/profile-basics → profileCompleted=true → 메인 라우팅.
 *
 * UX:
 *   - "마지막 단계예요" 톤 — 강제 진입이지만 압박감 최소화
 *   - 휴대폰 자동 하이픈 (010-XXXX-XXXX)
 *   - 생년월일은 YYYY-MM-DD 자유 입력 (DatePicker 는 P2)
 *   - 건너뛰기 없음 — 본 화면 통과 시점이 가입 완성 시점
 */
const formatKoreanPhone = (raw: string): string => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 11);
    if (digits.length < 4) {
        return digits;
    }
    if (digits.length < 8) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const isValidPhone = (formatted: string): boolean => {
    const digits = formatted.replace(/[^0-9]/g, '');
    return /^01[016789]\d{7,8}$/.test(digits);
};

const isValidBirthDate = (raw: string): boolean => {
    if (!raw) return true; // 선택
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
    const d = new Date(raw);
    return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= new Date().getFullYear();
};

export default function ProfileBasicsScreen({navigation}: Props) {
    const {user, login: _login} = useAuth() as any;
    const r = useResponsive();
    const c = useThemeColors();

    const [name, setName] = useState<string>(user?.name ?? '');
    const [phone, setPhone] = useState<string>(formatKoreanPhone(user?.phone ?? ''));
    const [birthDate, setBirthDate] = useState<string>('');
    const [phoneError, setPhoneError] = useState<string | undefined>();
    const [birthError, setBirthError] = useState<string | undefined>();
    const [submitting, setSubmitting] = useState(false);

    const titleMargin = r.pick({compact: spacing.md, default: spacing.lg});
    const formGap = r.pick({compact: spacing.sm, default: spacing.md});

    const isReady = useMemo(
        () => name.trim().length >= 2 && isValidPhone(phone) && isValidBirthDate(birthDate),
        [name, phone, birthDate],
    );

    const onChangePhone = (v: string) => {
        const formatted = formatKoreanPhone(v);
        setPhone(formatted);
        if (phoneError && isValidPhone(formatted)) {
            setPhoneError(undefined);
        }
    };

    const onBlurPhone = () => {
        if (phone && !isValidPhone(phone)) {
            setPhoneError('010으로 시작하는 휴대폰 번호를 입력해 주세요.');
        }
    };

    const onChangeBirth = (v: string) => {
        // YYYY-MM-DD 형태 자동 하이픈
        const digits = v.replace(/[^0-9]/g, '').slice(0, 8);
        let formatted = digits;
        if (digits.length >= 5) {
            formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}${digits.length > 6 ? `-${digits.slice(6)}` : ''}`;
        }
        setBirthDate(formatted);
        if (birthError && isValidBirthDate(formatted)) {
            setBirthError(undefined);
        }
    };

    const onBlurBirth = () => {
        if (birthDate && !isValidBirthDate(birthDate)) {
            setBirthError('생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.');
        }
    };

    const handleSubmit = async () => {
        if (!isReady) {
            if (name.trim().length < 2) AppToast.warn('이름을 2자 이상 입력해 주세요.');
            else if (!isValidPhone(phone)) {
                setPhoneError('010으로 시작하는 휴대폰 번호를 입력해 주세요.');
                AppToast.warn('휴대폰 번호를 확인해 주세요.');
            }
            return;
        }
        setSubmitting(true);
        try {
            await userService.updateProfileBasics({
                phone,
                name: name.trim(),
                birthDate: birthDate || undefined,
            });
            AppToast.success('환영해요! 이제 시작해 볼까요?');
            // role 기반 라우팅 — AuthNavigator 기존 패턴과 동일
            const role = (user?.role as string) || 'PERSONAL';
            const target =
                role === 'MASTER'
                    ? 'MasterMyPageScreen'
                    : role === 'EMPLOYEE'
                        ? 'EmployeeMyPageScreen'
                        : 'UserMyPageScreen';
            navigation.reset({
                index: 0,
                routes: [{name: 'HomeRoot' as never, params: {screen: target} as never}] as any,
            });
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="기본 정보" />}
            footer={
                <CtaStack bordered>
                    <AppButton
                        label="저장하고 시작하기"
                        loading={submitting}
                        loadingLabel="저장 중..."
                        disabled={!isReady}
                        onPress={handleSubmit}
                    />
                    <AppText variant="caption" tone="tertiary" center>
                        입력하신 정보는 알림·고객지원에만 쓰여요. 광고 발송은 따로 동의받아요.
                    </AppText>
                </CtaStack>
            }>
            <AppCard variant="warm" hero>
                <AppText variant="headingSm">마지막 단계예요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={[styles.heroSub, {marginTop: titleMargin / 2}]}>
                    소담이 사장님·직원분께 도움 될 때 연락드릴 수 있게,{'\n'}
                    기본 정보를 한 번만 알려주세요.
                </AppText>
            </AppCard>

            <View style={[styles.form, {gap: formGap, marginTop: titleMargin}]}>
                <AppInput
                    label="이름"
                    value={name}
                    onChangeText={setName}
                    placeholder="실명 또는 닉네임"
                    autoCapitalize="words"
                    helper="2~50자, 직원 매칭·급여명세에 표기돼요"
                />
                <AppInput
                    label="휴대폰 번호 *"
                    value={phone}
                    onChangeText={onChangePhone}
                    onBlur={onBlurPhone}
                    placeholder="010-1234-5678"
                    keyboardType="phone-pad"
                    maxLength={13}
                    error={phoneError}
                    helper="알림·고객지원에만 사용해요"
                />
                <AppInput
                    label="생년월일 (선택)"
                    value={birthDate}
                    onChangeText={onChangeBirth}
                    onBlur={onBlurBirth}
                    placeholder="1990-01-01"
                    keyboardType="number-pad"
                    maxLength={10}
                    error={birthError}
                    helper="만 14세 이상 확인용. 입력 안 해도 괜찮아요."
                />
            </View>

            <Pressable
                onPress={() =>
                    AppToast.show(
                        '소담은 휴대폰 번호로 광고·마케팅 메시지를 보내지 않아요. 마케팅 수신은 별도 화면에서 켤 수 있어요.',
                    )
                }
                style={({pressed}) => [styles.privacyRow, pressed && {opacity: 0.5}]}>
                <AppText variant="caption" tone="brand" weight="700">
                    개인정보 사용 방식 자세히 보기
                </AppText>
            </Pressable>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    heroSub: {opacity: 0.85},
    form: {},
    privacyRow: {alignItems: 'center', paddingVertical: spacing.lg},
});
