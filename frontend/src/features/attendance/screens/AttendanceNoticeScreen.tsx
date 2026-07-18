import {
    AppButton,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    CtaStack,
    ScreenContainer,
    SegmentedControl,
    SuccessState,
} from '../../../common/components/ds';
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {DATE_DIGITS_HELPER, dateDigitsToIso, isValidDateDigits, sanitizeDateDigits} from '../../../common/utils/dateTimeInput';
import attendanceIrregularityService from '../services/attendanceIrregularityService';
import type {AttendanceNoticeType} from '../types';

/**
 * 지각/조퇴/결근 사전 신고 — 직원 본인. 사장에게 알리는 용도일 뿐 임금 계산에는 영향이 없다.
 * 실제 공제 여부는 사후에 사장이 "지각/조퇴/결근" 확인 화면에서 결정한다.
 */

const TYPE_OPTIONS: Array<{label: string; value: AttendanceNoticeType}> = [
    {label: '지각', value: 'LATE_EXPECTED'},
    {label: '조퇴', value: 'EARLY_LEAVE_EXPECTED'},
    {label: '결근', value: 'ABSENCE_EXPECTED'},
];

function todayDigits(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

const AttendanceNoticeScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'AttendanceNotice'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const storeId = route.params?.storeId;

    const [typeIdx, setTypeIdx] = useState(0);
    const [forDate, setForDateValue] = useState(todayDigits());
    const setForDate = (value: string) => setForDateValue(sanitizeDateDigits(value));
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!storeId) {
            AppToast.warn('매장 정보가 없어요.');
            return;
        }
        if (!isValidDateDigits(forDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        setLoading(true);
        try {
            await attendanceIrregularityService.createNotice(
                storeId, dateDigitsToIso(forDate), TYPE_OPTIONS[typeIdx].value, message.trim() || undefined,
            );
            setSubmitted(true);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '신고에 실패했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <ScreenContainer header={<AppHeader title="지각/조퇴/결근 알리기" onBack={() => navigation.goBack()} />}>
                <SuccessState
                    title="사장님께 알렸어요"
                    description="실제 공제 여부는 사장님이 확인 후 처리해요."
                    primary={{label: '돌아가기', onPress: () => navigation.goBack()}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="지각/조퇴/결근 알리기" onBack={() => navigation.goBack()} />}
            footer={
                <CtaStack>
                    <AppButton label="사장님께 알리기" loading={loading} onPress={submit} />
                </CtaStack>
            }>
            <View style={styles.hero}>
                <AppText variant="headingMd">미리 알려주세요</AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.sub}>
                    이 신고는 사장님께 알림만 가고 임금에는 영향을 주지 않아요. 실제 공제/연차 전환 여부는
                    사장님이 나중에 확인해 처리해요.
                </AppText>
            </View>

            <View style={styles.form}>
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>유형</AppText>
                    <SegmentedControl
                        options={TYPE_OPTIONS.map(o => o.label)}
                        value={typeIdx}
                        onChange={setTypeIdx}
                    />
                </View>

                <AppInput
                    label="날짜"
                    placeholder="20260601"
                    value={forDate}
                    onChangeText={setForDate}
                    keyboardType="number-pad"
                    maxLength={8}
                    helper={DATE_DIGITS_HELPER}
                />

                <AppInput
                    label="메시지(선택)"
                    placeholder="예: 차가 막혀서 15분 정도 늦을 것 같아요"
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={300}
                    helper={`${message.length} / 300자`}
                />
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.sm},
    sub: {marginTop: spacing.sm},
    form: {marginTop: spacing.xl, gap: spacing.md},
    fieldLabel: {marginBottom: spacing.xs, marginLeft: 2},
});

export default AttendanceNoticeScreen;
