import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {
    AppButton,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
} from '../../../common/components/ds';
import SodamLogo from '../../../common/components/logo/SodamLogo';
import {spacing} from '../../../theme/tokens';
import {useResponsive} from '../../../common/hooks/useResponsive';
import {useAuth} from '../../../contexts/AuthContext';
import userService from '../services/userService';
import {AuthStackParamList} from '../../../navigation/types';
import {resetToRootRoute, resolvePostAuthRoute} from '../../../navigation/authFlow';
import {queryKeys} from '../../../common/utils/queryClient';
import {User} from '../services/authService';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';

interface Props {
    navigation: NavigationProp<any>;
    route: RouteProp<AuthStackParamList, 'ProfileBasics'>;
}

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
    if (!raw) {
        return true;
    }
    if (!isValidDateDigits(raw)) {
        return false;
    }
    const year = Number(raw.slice(0, 4));
    return year >= 1900 && year <= new Date().getFullYear();
};

export default function ProfileBasicsScreen({navigation, route}: Props) {
    const {user} = useAuth();
    const queryClient = useQueryClient();
    const r = useResponsive();

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
        const digits = sanitizeDateDigits(v);
        setBirthDate(digits);
        if (birthError && isValidBirthDate(digits)) {
            setBirthError(undefined);
        }
    };

    const onBlurBirth = () => {
        if (birthDate && !isValidBirthDate(birthDate)) {
            setBirthError(DATE_DIGITS_HELPER);
        }
    };

    const handleSubmit = async () => {
        if (!isReady) {
            if (name.trim().length < 2) {
                AppToast.warn('이름은 2자 이상 입력해 주세요.');
            } else if (!isValidPhone(phone)) {
                setPhoneError('010으로 시작하는 휴대폰 번호를 입력해 주세요.');
                AppToast.warn('휴대폰 번호를 확인해 주세요.');
            } else if (!isValidBirthDate(birthDate)) {
                setBirthError(DATE_DIGITS_HELPER);
                AppToast.warn('생년월일을 확인해 주세요.');
            }
            return;
        }
        if (!user) {
            AppToast.error('로그인 정보가 필요합니다. 다시 로그인해 주세요.');
            navigation.reset({
                index: 0,
                routes: [{name: 'Auth' as never, params: {screen: 'Login', params: route.params} as never}] as any,
            });
            return;
        }
        setSubmitting(true);
        try {
            await userService.updateProfileBasics({
                phone,
                name: name.trim(),
                birthDate: birthDate ? dateDigitsToIso(birthDate) : undefined,
            });

            const nextUser: User = {
                ...user,
                name: name.trim(),
                phone,
                profileCompleted: true,
            };
            queryClient.setQueryData<User | null>(queryKeys.auth.currentUser(), nextUser);

            AppToast.success('기본 정보가 저장되었습니다. 이제 시작해 볼까요?');
            resetToRootRoute(navigation, resolvePostAuthRoute(nextUser, route.params?.selectedPurpose));
        } catch (e: any) {
            const msg = e?.response?.data?.message ?? '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScreenContainer
            scroll
            footer={
                <CtaStack bordered>
                    <AppButton
                        label="저장하고 시작"
                        loading={submitting}
                        loadingLabel="저장 중..."
                        disabled={!isReady}
                        onPress={handleSubmit}
                    />
                    <AppText variant="caption" tone="tertiary" center>
                        입력한 정보는 알림과 고객지원에만 사용합니다.
                    </AppText>
                </CtaStack>
            }>
            <View style={styles.logoRow}>
                <SodamLogo size={56} variant="default" />
            </View>
            <AppCard variant="warm" hero>
                <AppText variant="headingMd">마지막 필수 설정이에요</AppText>
                <AppText variant="bodyLg" tone="secondary" style={[styles.heroSub, {marginTop: titleMargin / 2}]}>
                    연락 가능한 기본 정보만 확인하면 끝이에요.
                </AppText>
            </AppCard>

            <View style={[styles.form, {gap: formGap, marginTop: titleMargin}]}>
                <AppInput
                    label="이름"
                    value={name}
                    onChangeText={setName}
                    placeholder="실명 또는 닉네임"
                    autoCapitalize="words"
                    helper="2자 이상 입력해 주세요."
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
                    helper="알림과 고객지원에 사용해요."
                />
                <AppInput
                    label="생년월일 (선택)"
                    value={birthDate}
                    onChangeText={onChangeBirth}
                    onBlur={onBlurBirth}
                    placeholder="19900101"
                    keyboardType="number-pad"
                    maxLength={8}
                    error={birthError}
                    helper={DATE_DIGITS_HELPER}
                />
            </View>

            <Pressable
                onPress={() =>
                    AppToast.show(
                        '저희는 전화번호로 연락하거나 메시지를 보내지 않아요. 원하시면 알림 설정에서 변경할 수 있어요.',
                    )
                }
                style={({pressed}) => [styles.privacyRow, pressed && {opacity: 0.5}]}>
                <AppText variant="caption" tone="brand" weight="700">
                    개인정보 사용 동의 안내 보기
                </AppText>
            </Pressable>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    logoRow: {alignItems: 'center', marginBottom: spacing.lg},
    heroSub: {opacity: 0.85},
    form: {},
    privacyRow: {alignItems: 'center', paddingVertical: spacing.lg},
});
