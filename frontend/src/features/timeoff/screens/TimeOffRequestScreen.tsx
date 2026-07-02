import {AppToast, AppButton, AppHeader, AppInput, AppText, CtaStack, ScreenContainer, SuccessState} from '../../../common/components/ds';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import api from '../../../common/utils/api';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';

/**
 * 26 TimeOffRequest ???뺤젙 ?쒖븞.
 * 吏곸썝 ?닿? ????좎껌. 寃利??쒖텧 濡쒖쭅 蹂댁〈 (BE: storeId/startDate/endDate/reason).
 */
const TimeOffRequestScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'TimeOffRequest'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const storeId = route.params?.storeId;

    const [startDate, setStartDateValue] = useState('');
    const [endDate, setEndDateValue] = useState('');
    const setStartDate = (value: string) => setStartDateValue(sanitizeDateDigits(value));
    const setEndDate = (value: string) => setEndDateValue(sanitizeDateDigits(value));
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!storeId) {
            AppToast.warn('留ㅼ옣 ?뺣낫媛 ?놁뼱??');
            return;
        }
        if (!isValidDateDigits(startDate) || !isValidDateDigits(endDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        const startDateIso = dateDigitsToIso(startDate);
        const endDateIso = dateDigitsToIso(endDate);
        if (new Date(endDateIso) < new Date(startDateIso)) {
            AppToast.warn('醫낅즺?쇱? ?쒖옉???댄썑?ъ빞 ?댁슂.');
            return;
        }
        if (!reason.trim() || reason.trim().length < 2) {
            AppToast.warn('?ъ쑀瑜?2???댁긽 ?묒꽦??二쇱꽭??');
            return;
        }
        setLoading(true);
        try {
            await api.post('/api/timeoff/self', {storeId, startDate: startDateIso, endDate: endDateIso, reason: reason.trim()});
            setSubmitted(true);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '?좎껌???ㅽ뙣?덉뼱??');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <ScreenContainer header={<AppHeader title="휴가 신청" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="휴가 신청을 보냈어요"
                    description="승인 결과는 알림으로 알려드릴게요."
                    primary={{label: '내 정보로 돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="휴가 신청" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="휴가 신청하기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <View style={styles.hero}>
                <AppText variant="headingMd">휴가를 신청해요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.sub}>
                    시작일, 종료일, 사유를 입력하면 사장 승인 후 반영돼요.
                </AppText>
            </View>

            <View style={styles.form}>
                <AppInput label="시작일" placeholder="20260601" value={startDate} onChangeText={setStartDate} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
                <AppInput label="종료일" placeholder="20260603" value={endDate} onChangeText={setEndDate} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
                <AppInput
                    label="사유"
                    placeholder="예: 가족 행사 / 병원 진료"
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    maxLength={200}
                    helper={`${reason.length} / 200자`}
                />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.sm},
    sub: {marginTop: spacing.sm},
    form: {marginTop: spacing.xl, gap: spacing.md},
});

export default TimeOffRequestScreen;
