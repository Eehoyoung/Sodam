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
import {
    DATE_DIGITS_HELPER,
    TIME_DIGITS_HELPER,
    dateDigitsToIso,
    isValidDateDigits,
    isValidTimeDigits,
    sanitizeDateDigits,
    sanitizeTimeDigits,
    timeDigitsToHHmmss,
} from '../../../common/utils/dateTimeInput';
import myLeaveService from '../services/myLeaveService';
import type {TimeOffLeaveType, TimeOffUnit} from '../types';

/**
 * 26 TimeOffRequest 확정 시안 — 직원 본인 휴가 셀프 신청.
 * BE: POST /api/timeoff/self(storeId/startDate/endDate/reason 필수,
 * leaveType·unit·startTime·endTime 은 unit=HOURS 일 때만 시각 필드 사용).
 */

const LEAVE_TYPE_OPTIONS: Array<{label: string; value: TimeOffLeaveType}> = [
    {label: '연차', value: 'ANNUAL'},
    {label: '무급', value: 'UNPAID'},
    {label: '기타', value: 'OTHER'},
];

const UNIT_OPTIONS: Array<{label: string; value: TimeOffUnit}> = [
    {label: '종일', value: 'FULL_DAY'},
    {label: '반차', value: 'HALF_DAY'},
    {label: '시간단위', value: 'HOURS'},
];

const TimeOffRequestScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'TimeOffRequest'>>();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const storeId = route.params?.storeId;

    const [leaveTypeIdx, setLeaveTypeIdx] = useState(0);
    const [unitIdx, setUnitIdx] = useState(0);
    const unit = UNIT_OPTIONS[unitIdx].value;
    const isHours = unit === 'HOURS';
    // 반차·시간단위는 서버가 startDate===endDate 를 강제하는 당일 신청이다.
    const isSingleDay = unit === 'HALF_DAY' || unit === 'HOURS';

    const [startDate, setStartDateValue] = useState('');
    const [endDate, setEndDateValue] = useState('');
    const setStartDate = (value: string) => {
        const sanitized = sanitizeDateDigits(value);
        setStartDateValue(sanitized);
        setEndDateValue(prev => (isSingleDay ? sanitized : prev));
    };
    const setEndDate = (value: string) => setEndDateValue(sanitizeDateDigits(value));

    const [startTime, setStartTimeValue] = useState('');
    const setStartTime = (value: string) => setStartTimeValue(sanitizeTimeDigits(value));
    const [endTime, setEndTimeValue] = useState('');
    const setEndTime = (value: string) => setEndTimeValue(sanitizeTimeDigits(value));

    const onUnitChange = (idx: number) => {
        setUnitIdx(idx);
        if (UNIT_OPTIONS[idx].value === 'HALF_DAY' || UNIT_OPTIONS[idx].value === 'HOURS') {
            setEndDateValue(startDate);
        }
    };

    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const submit = async () => {
        if (!storeId) {
            AppToast.warn('매장 정보가 없어요.');
            return;
        }
        const effectiveEndDate = isSingleDay ? startDate : endDate;
        if (!isValidDateDigits(startDate) || !isValidDateDigits(effectiveEndDate)) {
            AppToast.warn(DATE_DIGITS_HELPER);
            return;
        }
        const startDateIso = dateDigitsToIso(startDate);
        const endDateIso = dateDigitsToIso(effectiveEndDate);
        if (new Date(endDateIso) < new Date(startDateIso)) {
            AppToast.warn('종료일자는 시작일 이후여야 해요.');
            return;
        }
        if (!reason.trim() || reason.trim().length < 2) {
            AppToast.warn('사유를 2자 이상 작성해 주세요.');
            return;
        }
        if (isHours) {
            if (!isValidTimeDigits(startTime) || !isValidTimeDigits(endTime)) {
                AppToast.warn(TIME_DIGITS_HELPER);
                return;
            }
            if (timeDigitsToHHmmss(startTime) >= timeDigitsToHHmmss(endTime)) {
                AppToast.warn('시작 시각은 종료 시각보다 빨라야 해요.');
                return;
            }
        }
        setLoading(true);
        try {
            await myLeaveService.createTimeOffRequest({
                storeId,
                startDate: startDateIso,
                endDate: endDateIso,
                reason: reason.trim(),
                leaveType: LEAVE_TYPE_OPTIONS[leaveTypeIdx].value,
                unit,
                startTime: isHours ? timeDigitsToHHmmss(startTime) : undefined,
                endTime: isHours ? timeDigitsToHHmmss(endTime) : undefined,
            });
            setSubmitted(true);
        } catch (e: any) {
            AppToast.error(e?.response?.data?.message ?? '신청에 실패했어요. 잔여 연차나 입력값을 확인해 주세요.');
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
                    secondary={{label: '내 요청 확인하기', onPress: () => navigation.navigate('RequestStatus')}}
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
                    유형·단위·기간·사유를 입력하면 사장 승인 후 반영돼요.
                </AppText>
            </View>

            <View style={styles.form}>
                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>휴가 유형</AppText>
                    <SegmentedControl
                        options={LEAVE_TYPE_OPTIONS.map(o => o.label)}
                        value={leaveTypeIdx}
                        onChange={setLeaveTypeIdx}
                    />
                </View>

                <View>
                    <AppText variant="caption" tone="secondary" style={styles.fieldLabel}>신청 단위</AppText>
                    <SegmentedControl
                        options={UNIT_OPTIONS.map(o => o.label)}
                        value={unitIdx}
                        onChange={onUnitChange}
                    />
                </View>

                <AppInput label="시작일" placeholder="20260601" value={startDate} onChangeText={setStartDate} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />

                {isHours ? (
                    <View style={styles.timeRow}>
                        <AppInput
                            label="시작 시각"
                            placeholder="1700"
                            value={startTime}
                            onChangeText={setStartTime}
                            keyboardType="number-pad"
                            maxLength={4}
                            helper={TIME_DIGITS_HELPER}
                            containerStyle={styles.timeField}
                        />
                        <AppInput
                            label="종료 시각"
                            placeholder="2200"
                            value={endTime}
                            onChangeText={setEndTime}
                            keyboardType="number-pad"
                            maxLength={4}
                            helper={TIME_DIGITS_HELPER}
                            containerStyle={styles.timeField}
                        />
                    </View>
                ) : isSingleDay ? null : (
                    <AppInput label="종료일" placeholder="20260603" value={endDate} onChangeText={setEndDate} keyboardType="number-pad" maxLength={8} helper={DATE_DIGITS_HELPER} />
                )}

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
    fieldLabel: {marginBottom: spacing.xs, marginLeft: 2},
    timeRow: {flexDirection: 'row', gap: spacing.md},
    timeField: {flex: 1},
});

export default TimeOffRequestScreen;
