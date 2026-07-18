/**
 * OurPostingScreen — [사장] 우리 공고·지원자 (260711_작업통합.md Part 2 §19.4 R-15, Phase 6).
 *
 * `JobSeekerListScreen` 허브의 "우리 공고·지원자" 탭 본문으로 임베드된다(구직 설정 탭이
 * `JobSeekingSettingsScreen` 을 임베드하는 것과 동일 패턴 — 헤더/ScreenContainer 는 허브 소유).
 *
 * 구성: 공고 upsert 폼(유형·업종·근무일(대타)·시간대·시급·한줄소개·구인중 ON/OFF, 매장당 1건이라
 * 기존 공고가 있으면 프리필된 수정 폼) → 지원자 리스트(§5.3 구직자 카드와 동일 정보 구성) →
 * 지원자별 수락/거절.
 *
 * 재조회 전략(FE-DUP 수정, findings_report.md §4.1): `useMyJobPosting`/`useStoreJobApplications`
 * 는 둘 다 `staleTime: 0` — 탭을 조건부 렌더로 마운트/언마운트하는 상위 구조
 * (`{topTab==='ourPostings' ? <OurPostingScreen/> : null}`)에서 이 화면은 세그먼트 전환마다
 * 매번 새로 마운트되므로, TanStack Query 기본 `refetchOnMount` 만으로 "세그먼트 전환마다 재조회"가
 * 이미 충족된다. 예전에는 여기에 수동 `useFocusEffect(refetch)` 를 두 쿼리 모두에 얹어 마운트
 * 자동조회와 겹쳐 최초 진입 시 API가 최대 4회(공고·지원자 각 2회) 중복 호출됐다.
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Switch, View} from 'react-native';
import {
    AppBadge,
    AppCard,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    ErrorState,
    LoadingState,
} from '../../../common/components/ds';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {
    useMyJobPosting,
    useRespondToJobApplication,
    useStoreJobApplications,
    useUpsertJobPosting,
} from '../hooks/useRecruitmentQueries';
import {
    JOB_CATEGORY_CODES,
    JOB_CATEGORY_LABELS,
    JOB_POSTING_ERROR_MESSAGES,
    JOB_RESPONSE_STATUS_LABELS,
    JOB_RESPONSE_STATUS_TONE,
    JobApplicantListItem,
    JobCategoryCode,
    JobPostingErrorCode,
    JobPostingUpsertPayload,
    JobSeekingType,
    SEEKING_TYPE_LABELS,
    SEEKING_TYPE_OPTIONS,
} from '../types';
import {
    compactDateFromApi,
    compactTimeFromApi,
    DATE_DIGITS_HELPER,
    dateDigitsToIso,
    isValidDateDigits,
    isValidTimeDigits,
    sanitizeDateDigits,
    sanitizeTimeDigits,
    timeDigitsToHHmmss,
    TIME_DIGITS_HELPER,
} from '../../../common/utils/dateTimeInput';

function extractErrorCode(err: unknown): JobPostingErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobPostingErrorCode
        | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

interface OurPostingScreenProps {
    storeId: number;
}

const OurPostingScreen: React.FC<OurPostingScreenProps> = ({storeId}) => {
    const c = useThemeColors();
    const postingQuery = useMyJobPosting(storeId);
    const upsertMutation = useUpsertJobPosting(storeId);
    const applicationsQuery = useStoreJobApplications(storeId);
    const respondMutation = useRespondToJobApplication(storeId);

    const [workType, setWorkType] = useState<JobSeekingType>('SUBSTITUTE');
    const [jobCategory, setJobCategory] = useState<JobCategoryCode | null>(null);
    const [workDateDigits, setWorkDateDigits] = useState('');
    const [startDigits, setStartDigits] = useState('0900');
    const [endDigits, setEndDigits] = useState('1800');
    const [wageDigits, setWageDigits] = useState('');
    const [message, setMessage] = useState('');
    const [open, setOpen] = useState(true);
    const [dirty, setDirty] = useState(false);

    // 기존 공고 → 폼 프리필(사용자가 편집 중이면 덮어쓰지 않음).
    useEffect(() => {
        const posting = postingQuery.data;
        if (!posting || dirty) {
            return;
        }
        setWorkType(posting.workType);
        setJobCategory(posting.jobCategory);
        setWorkDateDigits(posting.workDate ? compactDateFromApi(posting.workDate) : '');
        setStartDigits(compactTimeFromApi(posting.startTime) || '0900');
        setEndDigits(compactTimeFromApi(posting.endTime) || '1800');
        setWageDigits(posting.hourlyWage ? String(posting.hourlyWage) : '');
        setMessage(posting.message ?? '');
        setOpen(posting.open);
    }, [postingQuery.data, dirty]);

    const handleSave = async () => {
        if (!jobCategory) {
            AppToast.warn('업종을 선택해 주세요.');
            return;
        }
        if (workType === 'SUBSTITUTE' && !isValidDateDigits(workDateDigits)) {
            AppToast.warn(JOB_POSTING_ERROR_MESSAGES.JOB_POSTING_WORK_DATE_REQUIRED);
            return;
        }
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
            AppToast.warn('시급을 입력해 주세요.');
            return;
        }

        const payload: JobPostingUpsertPayload = {
            workType,
            jobCategory,
            workDate: workType === 'SUBSTITUTE' ? dateDigitsToIso(workDateDigits) : null,
            startTime,
            endTime,
            hourlyWage: wage,
            message: message.trim() || undefined,
            open,
        };

        try {
            await upsertMutation.mutateAsync(payload);
            setDirty(false);
            AppToast.success(open ? '공고를 올렸어요.' : '공고를 저장했어요.');
        } catch (err: unknown) {
            const errorCode = extractErrorCode(err);
            const msg =
                (errorCode ? JOB_POSTING_ERROR_MESSAGES[errorCode] : undefined) ??
                extractErrorMessage(err) ??
                '공고를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        }
    };

    const handleRespond = async (applicationId: number, accept: boolean) => {
        try {
            await respondMutation.mutateAsync({applicationId, accept});
            AppToast.success(accept ? '지원을 수락했어요.' : '지원을 거절했어요.');
        } catch (err: unknown) {
            const msg = extractErrorMessage(err) ?? '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        }
    };

    if (postingQuery.isLoading) {
        return <LoadingState title="공고 불러오는 중" description="잠시만 기다려 주세요" />;
    }

    return (
        <View style={styles.container} testID="our-posting-screen">
            <AppCard variant="flat" style={styles.card}>
                <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>
                    구인 공고
                </AppText>

                <View style={styles.toggleRow}>
                    <View style={styles.flex1}>
                        <AppText variant="bodyMd" weight="700">구인중</AppText>
                        <AppText variant="caption" tone="secondary">
                            {open ? '켜져 있어요. 주변 구인 리스트에 노출돼요.' : '꺼져 있어요.'}
                        </AppText>
                    </View>
                    <Switch
                        testID="our-posting-open-toggle"
                        value={open}
                        onValueChange={v => {
                            setDirty(true);
                            setOpen(v);
                        }}
                        trackColor={{false: c.border, true: recruit.primary}}
                        thumbColor={c.background}
                    />
                </View>

                <AppText variant="bodyMd" weight="700" style={styles.fieldLabel}>근무 형태</AppText>
                <View style={styles.chipRow}>
                    {SEEKING_TYPE_OPTIONS.map(type => {
                        const selected = workType === type;
                        return (
                            <Pressable
                                key={type}
                                testID={`our-posting-type-chip-${type}`}
                                onPress={() => {
                                    setDirty(true);
                                    setWorkType(type);
                                }}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                style={[
                                    styles.chip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {SEEKING_TYPE_LABELS[type]}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>

                <AppText variant="bodyMd" weight="700" style={styles.fieldLabel}>업종</AppText>
                <View style={styles.chipWrap}>
                    {JOB_CATEGORY_CODES.map(code => {
                        const selected = jobCategory === code;
                        return (
                            <Pressable
                                key={code}
                                testID={`our-posting-category-chip-${code}`}
                                onPress={() => {
                                    setDirty(true);
                                    setJobCategory(code);
                                }}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                style={[
                                    styles.chip,
                                    {
                                        borderColor: selected ? recruit.primary : c.border,
                                        backgroundColor: selected ? recruit.primarySoft : c.background,
                                    },
                                ]}>
                                <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                                    {JOB_CATEGORY_LABELS[code]}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>

                {workType === 'SUBSTITUTE' ? (
                    <AppInput
                        testID="our-posting-workdate-input"
                        label="근무일"
                        value={workDateDigits}
                        onChangeText={v => {
                            setDirty(true);
                            setWorkDateDigits(sanitizeDateDigits(v));
                        }}
                        placeholder="20260713"
                        keyboardType="number-pad"
                        maxLength={8}
                        helper={DATE_DIGITS_HELPER}
                        containerStyle={styles.fieldGap}
                    />
                ) : null}

                <View style={[styles.timeRow, styles.fieldGap]}>
                    <AppInput
                        testID="our-posting-start-input"
                        label="시작"
                        value={startDigits}
                        onChangeText={v => {
                            setDirty(true);
                            setStartDigits(sanitizeTimeDigits(v));
                        }}
                        placeholder="0900"
                        keyboardType="number-pad"
                        maxLength={4}
                        helper={TIME_DIGITS_HELPER}
                        containerStyle={styles.timeInput}
                    />
                    <AppInput
                        testID="our-posting-end-input"
                        label="종료"
                        value={endDigits}
                        onChangeText={v => {
                            setDirty(true);
                            setEndDigits(sanitizeTimeDigits(v));
                        }}
                        placeholder="1800"
                        keyboardType="number-pad"
                        maxLength={4}
                        helper={TIME_DIGITS_HELPER}
                        containerStyle={styles.timeInput}
                    />
                </View>

                <AppInput
                    testID="our-posting-wage-input"
                    label="시급(원)"
                    value={wageDigits}
                    onChangeText={v => {
                        setDirty(true);
                        setWageDigits(v.replace(/\D/g, ''));
                    }}
                    placeholder="예: 10500"
                    keyboardType="number-pad"
                    containerStyle={styles.fieldGap}
                />

                <AppInput
                    testID="our-posting-message-input"
                    label="한줄 소개(선택)"
                    value={message}
                    onChangeText={v => {
                        setDirty(true);
                        setMessage(v.slice(0, 200));
                    }}
                    placeholder="예: 주말 오후 근무 가능하신 분 환영해요"
                    multiline
                    containerStyle={styles.fieldGap}
                />

                <Pressable
                    testID="our-posting-save-button"
                    onPress={handleSave}
                    disabled={upsertMutation.isPending}
                    accessibilityRole="button"
                    accessibilityState={{disabled: upsertMutation.isPending, busy: upsertMutation.isPending}}
                    style={({pressed}) => [
                        styles.saveBtn,
                        {backgroundColor: upsertMutation.isPending ? c.surfaceMuted : recruit.primary},
                        pressed && !upsertMutation.isPending ? styles.savePressed : null,
                    ]}>
                    <AppText variant="bodyLg" weight="700" style={{color: c.textInverse}}>
                        {postingQuery.data ? '공고 저장' : '공고 올리기'}
                    </AppText>
                </Pressable>
            </AppCard>

            <AppText variant="titleMd" weight="700" style={styles.applicantsTitle}>지원자</AppText>

            {applicationsQuery.isLoading ? (
                <LoadingState title="지원자 불러오는 중" description="잠시만 기다려 주세요" />
            ) : applicationsQuery.isError ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="지원자 리스트를 가져오지 못했어요."
                    primary={{label: '다시 시도', onPress: () => applicationsQuery.refetch()}}
                />
            ) : (applicationsQuery.data ?? []).length === 0 ? (
                <View testID="our-posting-applicants-empty">
                    <EmptyState title="아직 지원자가 없어요" description="공고를 올리면 지원자가 여기에 표시돼요." />
                </View>
            ) : (
                <View style={styles.applicantList} testID="our-posting-applicants-list">
                    {(applicationsQuery.data ?? []).map(app => (
                        <ApplicantCard
                            key={app.applicationId}
                            application={app}
                            onAccept={() => handleRespond(app.applicationId, true)}
                            onDecline={() => handleRespond(app.applicationId, false)}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

interface ApplicantCardProps {
    application: JobApplicantListItem;
    onAccept: () => void;
    onDecline: () => void;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({application, onAccept, onDecline}) => {
    const c = useThemeColors();
    return (
        <AppCard variant="flat" style={styles.applicantCard} testID={`applicant-card-${application.applicationId}`}>
            <View style={styles.cardTopRow}>
                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.flex1}>
                    {application.applicantName}
                    {application.age !== null ? ` · ${application.age}세` : ''}
                </AppText>
                <AppBadge label={JOB_RESPONSE_STATUS_LABELS[application.status]} tone={JOB_RESPONSE_STATUS_TONE[application.status]} />
            </View>

            {application.currentEmployment ? (
                <AppText variant="caption" tone="secondary">
                    {application.currentEmployment.storeName} · {application.currentEmployment.hireDate} ~ 현재
                </AppText>
            ) : (
                <AppBadge label="휴직중" tone="neutral" style={styles.badgeGap} />
            )}

            {application.message ? (
                <AppText variant="bodyMd" tone="secondary" style={styles.messageText}>
                    "{application.message}"
                </AppText>
            ) : null}

            {application.status === 'PENDING' ? (
                <View style={styles.actionRow}>
                    <Pressable
                        testID={`applicant-decline-${application.applicationId}`}
                        onPress={onDecline}
                        accessibilityRole="button"
                        style={[styles.actionBtn, styles.declineBtn, {borderColor: c.border}]}>
                        <AppText variant="bodyMd" weight="700" tone="secondary">거절</AppText>
                    </Pressable>
                    <Pressable
                        testID={`applicant-accept-${application.applicationId}`}
                        onPress={onAccept}
                        accessibilityRole="button"
                        style={[styles.actionBtn, {backgroundColor: recruit.primary}]}>
                        <AppText variant="bodyMd" weight="700" style={{color: c.textInverse}}>수락</AppText>
                    </Pressable>
                </View>
            ) : null}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    container: {gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxl},
    card: {gap: spacing.xs},
    sectionTitle: {marginBottom: spacing.xs},
    toggleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md},
    flex1: {flex: 1, minWidth: 0},
    fieldLabel: {marginTop: spacing.md, marginBottom: spacing.xs},
    chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    chip: {
        borderWidth: 1,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
    },
    timeRow: {flexDirection: 'row', gap: spacing.md},
    timeInput: {flex: 1},
    fieldGap: {marginTop: spacing.md},
    saveBtn: {
        marginTop: spacing.lg,
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savePressed: {opacity: 0.94, transform: [{scale: 0.98}]},
    applicantsTitle: {marginTop: spacing.sm},
    applicantList: {gap: spacing.sm},
    applicantCard: {gap: spacing.xs},
    cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    badgeGap: {marginTop: 2},
    messageText: {marginTop: spacing.xs},
    actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
    actionBtn: {flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    declineBtn: {borderWidth: 1},
});

export default OurPostingScreen;
