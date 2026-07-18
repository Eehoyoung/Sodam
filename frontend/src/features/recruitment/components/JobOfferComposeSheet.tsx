/**
 * JobOfferComposeSheet — [사장] 채용 제안 작성 바텀시트 (260711_작업통합.md Part 2 §15.5 R-11).
 *
 * 진입: `JobSeekerDetailScreen`(R-08) 하단 "채용 제안 보내기" CTA. 열릴 때마다(§16.2-4 "제안 작성
 * 3탭 이내" 목표):
 *   - 구직 유형(당일 대타/정기)은 `seeker.seekingTypes` 에 없는 쪽을 비활성 처리해 발송 전
 *     `OFFER_TYPE_MISMATCH`(400)를 예방한다(§16.2-5).
 *   - 근무 시간대는 대상 요일(대타=오늘/내일 선택값, 정기=오늘 요일)의 `seeker.availability` 로
 *     자동 프리필된다(§16.2-4) — 사용자가 시간을 직접 편집하면 이후 유형/근무일 전환에도 값을 보존한다.
 *   - 대타 근무일은 "오늘/내일" 두 선택지 기본값(§15.5).
 *
 * 발송 성공 시 토스트 + 시트 닫힘 + `onSent` 콜백(호출측이 상세/리스트 갱신).
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppInput, AppText, AppToast, BottomSheet} from '../../../common/components/ds';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useSendJobOffer} from '../hooks/useRecruitmentQueries';
import {
    JOB_OFFER_ERROR_MESSAGES,
    JobOffer,
    JobOfferErrorCode,
    JobSeekerListItem,
    JobSeekingType,
    SEEKING_TYPE_LABELS,
    SEEKING_TYPE_OPTIONS,
} from '../types';
import {
    addDaysWithDay,
    findAvailabilityForDay,
    resolveDefaultDay,
    resolveWorkDateOption,
    WorkDateOption,
} from '../utils/offerPrefill';
import {
    compactTimeFromApi,
    isValidTimeDigits,
    sanitizeTimeDigits,
    timeDigitsToHHmm,
    timeDigitsToHHmmss,
    TIME_DIGITS_HELPER,
} from '../../../common/utils/dateTimeInput';

function extractErrorCode(err: unknown): JobOfferErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobOfferErrorCode
        | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

interface JobOfferComposeSheetProps {
    visible: boolean;
    onClose: () => void;
    storeId: number;
    seeker: JobSeekerListItem;
    onSent?: (offer: JobOffer) => void;
    /** 테스트 전용 — 프리필 기준 시각 주입(기본값 `new Date()`). */
    now?: Date;
}

const WORK_DATE_OPTIONS: WorkDateOption[] = ['TODAY', 'TOMORROW'];
const WORK_DATE_LABELS: Record<WorkDateOption, string> = {TODAY: '오늘', TOMORROW: '내일'};

export const JobOfferComposeSheet: React.FC<JobOfferComposeSheetProps> = ({
    visible,
    onClose,
    storeId,
    seeker,
    onSent,
    now,
}) => {
    const c = useThemeColors();
    const sendOffer = useSendJobOffer(storeId);

    const [workType, setWorkType] = useState<JobSeekingType>(seeker.seekingTypes[0] ?? 'SUBSTITUTE');
    const [workDateOption, setWorkDateOption] = useState<WorkDateOption>('TODAY');
    const [startDigits, setStartDigits] = useState('0900');
    const [endDigits, setEndDigits] = useState('1800');
    const [timesDirty, setTimesDirty] = useState(false);
    const [wageDigits, setWageDigits] = useState('');
    const [message, setMessage] = useState('');

    const referenceNow = now ?? new Date();

    // 시트가 열릴 때마다 폼을 초기화하고 첫 프리필을 계산한다.
    useEffect(() => {
        if (!visible) {
            return;
        }
        const initialType = seeker.seekingTypes[0] ?? 'SUBSTITUTE';
        setWorkType(initialType);
        setWorkDateOption('TODAY');
        setTimesDirty(false);
        setWageDigits('');
        setMessage('');
        const day =
            initialType === 'SUBSTITUTE'
                ? resolveWorkDateOption('TODAY', referenceNow).day
                : resolveDefaultDay(referenceNow);
        const match = findAvailabilityForDay(seeker.availability, day);
        setStartDigits(match ? compactTimeFromApi(match.startTime) || '0900' : '0900');
        setEndDigits(match ? compactTimeFromApi(match.endTime) || '1800' : '1800');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, seeker.userId]);

    // 유형/근무일 선택이 바뀌면(사용자가 시간을 직접 건드리지 않은 한) 새 요일 기준으로 재프리필한다.
    useEffect(() => {
        if (!visible || timesDirty) {
            return;
        }
        const day =
            workType === 'SUBSTITUTE'
                ? resolveWorkDateOption(workDateOption, referenceNow).day
                : resolveDefaultDay(referenceNow);
        const match = findAvailabilityForDay(seeker.availability, day);
        if (match) {
            setStartDigits(compactTimeFromApi(match.startTime) || '0900');
            setEndDigits(compactTimeFromApi(match.endTime) || '1800');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workType, workDateOption]);

    const handleSelectType = (type: JobSeekingType) => {
        if (!seeker.seekingTypes.includes(type)) {
            return; // 구직 유형에 없는 형태는 선택 불가(발송 전 OFFER_TYPE_MISMATCH 예방, §16.2-5)
        }
        setWorkType(type);
    };

    const handleSubmit = async () => {
        if (!isValidTimeDigits(startDigits) || !isValidTimeDigits(endDigits)) {
            AppToast.warn('시간은 4자리 숫자로 입력해 주세요. 예: 0900');
            return;
        }
        const startTime = timeDigitsToHHmmss(startDigits);
        const endTime = timeDigitsToHHmmss(endDigits);
        if (startTime >= endTime) {
            AppToast.warn('종료 시간은 시작 시간보다 늦어야 해요.');
            return;
        }
        const wage = Number(wageDigits);
        if (!wageDigits || !Number.isFinite(wage) || wage <= 0) {
            AppToast.warn('제안 시급을 입력해 주세요.');
            return;
        }

        const workDate = workType === 'SUBSTITUTE' ? resolveWorkDateOption(workDateOption, referenceNow).iso : null;

        try {
            const offer = await sendOffer.mutateAsync({
                targetUserId: seeker.userId,
                workType,
                workDate,
                startTime,
                endTime,
                hourlyWage: wage,
                message: message.trim() || undefined,
            });
            AppToast.success('채용 제안을 보냈어요.');
            onSent?.(offer);
            onClose();
        } catch (err: unknown) {
            const errorCode = extractErrorCode(err);
            const msg =
                (errorCode ? JOB_OFFER_ERROR_MESSAGES[errorCode] : undefined) ??
                extractErrorMessage(err) ??
                '제안을 보내지 못했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        }
    };

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="채용 제안 보내기"
            description={`${seeker.name}님에게 보낼 제안을 작성해 주세요.`}
            scrollable
            primary={{
                testID: 'job-offer-submit-button',
                label: '제안 보내기',
                onPress: handleSubmit,
                loading: sendOffer.isPending,
            }}
            secondary={{testID: 'job-offer-cancel-button', label: '취소', onPress: onClose}}>
            <View style={styles.section}>
                <AppText variant="bodyMd" weight="700" style={styles.sectionTitle}>근무 형태</AppText>
                <View style={styles.chipRow}>
                    {SEEKING_TYPE_OPTIONS.map(type => {
                        const enabled = seeker.seekingTypes.includes(type);
                        const selected = workType === type;
                        return (
                            <Pressable
                                key={type}
                                testID={`job-offer-type-chip-${type}`}
                                onPress={() => handleSelectType(type)}
                                accessibilityRole="button"
                                accessibilityState={{selected, disabled: !enabled}}
                                style={[
                                    styles.chip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                        opacity: enabled ? 1 : 0.4,
                                    },
                                ]}>
                                <AppText
                                    variant="bodyMd"
                                    weight="700"
                                    style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {SEEKING_TYPE_LABELS[type]}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            {workType === 'SUBSTITUTE' ? (
                <View style={styles.section}>
                    <AppText variant="bodyMd" weight="700" style={styles.sectionTitle}>근무일</AppText>
                    <View style={styles.chipRow}>
                        {WORK_DATE_OPTIONS.map(option => {
                            const selected = workDateOption === option;
                            return (
                                <Pressable
                                    key={option}
                                    testID={`job-offer-workdate-chip-${option}`}
                                    onPress={() => setWorkDateOption(option)}
                                    accessibilityRole="button"
                                    accessibilityState={{selected}}
                                    style={[
                                        styles.chip,
                                        {
                                            borderColor: selected ? recruit.primary : c.border,
                                            backgroundColor: selected ? recruit.primarySoft : c.background,
                                        },
                                    ]}>
                                    <AppText
                                        variant="bodyMd"
                                        weight="700"
                                        style={{color: selected ? recruit.primary : c.textSecondary}}>
                                        {WORK_DATE_LABELS[option]} ({addDaysWithDay(referenceNow, option === 'TODAY' ? 0 : 1).iso})
                                    </AppText>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            ) : null}

            <View style={styles.timeRow}>
                <AppInput
                    testID="job-offer-start-input"
                    label="시작"
                    value={startDigits}
                    onChangeText={v => {
                        setStartDigits(sanitizeTimeDigits(v));
                        setTimesDirty(true);
                    }}
                    placeholder="0900"
                    keyboardType="number-pad"
                    maxLength={4}
                    helper={TIME_DIGITS_HELPER}
                    containerStyle={styles.timeInput}
                />
                <AppInput
                    testID="job-offer-end-input"
                    label="종료"
                    value={endDigits}
                    onChangeText={v => {
                        setEndDigits(sanitizeTimeDigits(v));
                        setTimesDirty(true);
                    }}
                    placeholder="1800"
                    keyboardType="number-pad"
                    maxLength={4}
                    helper={TIME_DIGITS_HELPER}
                    containerStyle={styles.timeInput}
                />
            </View>
            {isValidTimeDigits(startDigits) && isValidTimeDigits(endDigits) ? (
                <AppText variant="caption" tone="secondary" style={styles.timePreview}>
                    {timeDigitsToHHmm(startDigits)}~{timeDigitsToHHmm(endDigits)}
                </AppText>
            ) : null}

            <AppInput
                testID="job-offer-wage-input"
                label="제안 시급(원)"
                value={wageDigits}
                onChangeText={v => setWageDigits(v.replace(/\D/g, ''))}
                placeholder="예: 10500"
                keyboardType="number-pad"
                containerStyle={styles.fieldGap}
            />

            <AppInput
                testID="job-offer-message-input"
                label="한줄 메시지(선택)"
                value={message}
                onChangeText={v => setMessage(v.slice(0, 200))}
                placeholder="예: 목요일 저녁 대타 가능하실까요?"
                multiline
                containerStyle={styles.fieldGap}
            />
        </BottomSheet>
    );
};

const styles = StyleSheet.create({
    section: {marginBottom: spacing.md},
    sectionTitle: {marginBottom: spacing.xs},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    timeRow: {flexDirection: 'row', gap: spacing.md},
    timeInput: {flex: 1},
    timePreview: {marginTop: -spacing.xs, marginBottom: spacing.sm},
    fieldGap: {marginTop: spacing.md},
});

export default JobOfferComposeSheet;
