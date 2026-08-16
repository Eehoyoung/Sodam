/* eslint-disable react-native/no-color-literals -- 히어로 그라디언트 위 반투명 흰색 칩(AttendanceCreditSummaryCard와 동일 패턴) */
/**
 * JobPostingDetailScreen — [직원] 구인 공고 상세·지원 (260711_작업통합.md Part 2 §19.4 R-17, Phase 6).
 *
 * 진입점: `NearbyJobPostingsScreen`(R-16) 카드 탭 → push 전환. 라우트 파라미터로 리스트 항목
 * (`JobPostingNearbyItem`)을 그대로 전달받는다 — `JobSeekerDetailScreen`(§7.4-2)과 동일하게
 * 추가 조회 API 없음(v1). 선택 메시지 입력 후 "지원하기" 버튼으로 지원한다(§19.1).
 *
 * 히어로는 그라디언트 히어로 카드(`GradientHeroCard`, 기본 `gradient.brandStrong` 코랄)로
 * 시급을 강조한다 — 2026-08-01 기존 화면 리디자인(recruitment-monetization-gamification-plan.md
 * §6.2 "공고 상세")에서 `AttendanceCreditSummaryCard`(출근권 잔액 카드)의 그라디언트 히어로 패턴을
 * 이식했다. ⚠️ 2026-07-11 초안 주석은 이 자리를 "흰 배경 spot 카드"라 적었고 2026-07-20 확정은
 * "recruit 그린 미참조, 코랄만 액션 강조"였다 — 이번 변경은 그 원칙(그린 미참조)은 그대로 지키되,
 * 화면 톤의 주인공인 코랄(`gradient.brandStrong`)을 히어로 배경으로 승격한 것이라 상충하지 않는다.
 * 지원하기 CTA(코랄, footer)는 기존 그대로 유지.
 */
import React, {useState} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppButton, AppCard, AppHeader, AppInput, AppText, AppToast, GradientHeroCard, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useApplyToJobPosting, useRefineApplicationMessage} from '../hooks/useRecruitmentQueries';
import {
    JOB_APPLICATION_ERROR_MESSAGES,
    JOB_CATEGORY_LABELS,
    JobApplicationErrorCode,
    JobPostingNearbyItem,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, formatTimeRange} from '../utils/formatAvailability';
import {postingUrgencyLabel} from '../utils/postingUrgency';

function extractErrorCode(err: unknown): JobApplicationErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobApplicationErrorCode
        | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

interface Props {
    /** 개발용 시각 검증 전용 — route.params 없이도 posting을 지정한다. */
    visualFixture?: {posting: JobPostingNearbyItem};
}

const JobPostingDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobPostingDetail'>>();
    const posting = visualFixture?.posting ?? route.params.posting;
    const urgencyLabel = postingUrgencyLabel(posting.workType, posting.workDate);
    const [message, setMessage] = useState('');
    const [applied, setApplied] = useState(false);
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const applyMutation = useApplyToJobPosting();
    const refineMutation = useRefineApplicationMessage();

    const handleRefine = async () => {
        const trimmed = message.trim();
        if (!trimmed) {
            AppToast.warn('다듬을 지원 메시지를 먼저 입력해 주세요.');
            return;
        }
        setSuggestion(null);
        try {
            const result = await refineMutation.mutateAsync({postingId: posting.postingId, message: trimmed});
            if (result.changed && result.refined) {
                setSuggestion(result.refined);
            } else {
                AppToast.show('지금 메시지 그대로도 충분히 명확해요.');
            }
        } catch (err: unknown) {
            const errorCode = extractErrorCode(err);
            const msg =
                (errorCode ? JOB_APPLICATION_ERROR_MESSAGES[errorCode] : undefined) ??
                extractErrorMessage(err) ??
                '메시지 다듬기에 실패했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        }
    };

    const applySuggestion = () => {
        if (suggestion) {
            setMessage(suggestion);
        }
        setSuggestion(null);
    };

    const handleApply = async () => {
        try {
            await applyMutation.mutateAsync({
                postingId: posting.postingId,
                payload: message.trim() ? {message: message.trim()} : undefined,
            });
            setApplied(true);
            AppToast.success('지원을 완료했어요.');
        } catch (err: unknown) {
            const errorCode = extractErrorCode(err);
            const msg =
                (errorCode ? JOB_APPLICATION_ERROR_MESSAGES[errorCode] : undefined) ??
                extractErrorMessage(err) ??
                '지원하지 못했어요. 잠시 후 다시 시도해 주세요.';
            AppToast.error(msg);
        }
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="공고 상세" onBack={() => navigation.goBack()} />}
            footer={
                <View style={[styles.footer, {backgroundColor: c.background, borderTopColor: c.divider}]}>
                    <Pressable
                        testID="job-posting-apply-button"
                        onPress={handleApply}
                        disabled={applyMutation.isPending || applied}
                        accessibilityRole="button"
                        accessibilityState={{disabled: applyMutation.isPending || applied, busy: applyMutation.isPending}}
                        style={({pressed}) => [
                            styles.cta,
                            {backgroundColor: applied ? c.surfaceMuted : c.brandPrimary},
                            pressed && !applyMutation.isPending && !applied ? styles.ctaPressed : null,
                        ]}>
                        <AppText variant="bodyLg" weight="700" style={{color: applied ? c.textSecondary : c.textInverse}}>
                            {applied ? '지원 완료' : '지원하기'}
                        </AppText>
                    </Pressable>
                </View>
            }>
            <GradientHeroCard style={styles.hero} testID="job-posting-hero-card">
                <View style={styles.heroTopRow}>
                    <AppText variant="headingSm" weight="800" tone="inverse" numberOfLines={1} style={styles.heroNameFlex}>
                        {posting.storeName}
                    </AppText>
                    <View style={styles.heroChip}>
                        <AppText variant="caption" tone="inverse" weight="700">
                            {SEEKING_TYPE_LABELS[posting.workType]}
                        </AppText>
                    </View>
                </View>
                <AppText variant="bodyMd" tone="inverse" style={styles.heroSub}>
                    {formatDistanceKm(posting.distanceMeters)} · {JOB_CATEGORY_LABELS[posting.jobCategory]}
                </AppText>

                {urgencyLabel ? (
                    <View style={styles.heroUrgencyChip} testID="job-posting-urgency-badge">
                        <AppText variant="caption" tone="inverse" weight="800">
                            {`⏳ ${urgencyLabel}`}
                        </AppText>
                    </View>
                ) : null}

                {/* 시급 강조 — 22px→28px tabular-nums, 히어로 안으로 승격(§6.2 "시급 강조") */}
                <View style={styles.heroWageRow} testID="job-posting-money-card">
                    <AppText variant="caption" tone="inverse" style={styles.heroWageLabel}>시급</AppText>
                    <AppText tone="inverse" weight="800" style={styles.heroWageValue}>
                        {posting.hourlyWage.toLocaleString('ko-KR')}원
                    </AppText>
                </View>
            </GradientHeroCard>

            <Section title="근무 정보">
                <InfoRow label="근무일" value={posting.workDate ?? '수시'} />
                <InfoRow label="시간" value={formatTimeRange(posting.startTime, posting.endTime)} last />
            </Section>

            {posting.message ? (
                <Section title="한줄 소개">
                    <AppText variant="bodyMd" tone="secondary">{posting.message}</AppText>
                </Section>
            ) : null}

            <Section title="지원 메시지(선택)">
                <AppInput
                    testID="job-posting-message-input"
                    value={message}
                    onChangeText={v => {
                        setMessage(v.slice(0, 200));
                        setSuggestion(null);
                    }}
                    placeholder="예: 평일 저녁 근무 가능합니다."
                    multiline
                    editable={!applied}
                />
                <AppButton
                    label="AI로 메시지 다듬기"
                    variant="outline"
                    size="sm"
                    fullWidth={false}
                    loading={refineMutation.isPending}
                    disabled={applied}
                    onPress={handleRefine}
                    testID="job-posting-message-refine-button"
                    style={styles.refineButton}
                />
                {suggestion ? (
                    <AppCard variant="plain" style={styles.suggestionCard} testID="job-posting-message-suggestion">
                        <AppText variant="caption" tone="secondary">다듬은 제안이에요 — 검토 후 적용해 주세요</AppText>
                        <AppText variant="bodyMd" style={styles.suggestionText}>{suggestion}</AppText>
                        <View style={styles.suggestionActions}>
                            <AppButton label="닫기" variant="ghost" size="sm" fullWidth={false} onPress={() => setSuggestion(null)} />
                            <AppButton
                                label="이 문구로 적용"
                                variant="secondary"
                                size="sm"
                                fullWidth={false}
                                onPress={applySuggestion}
                                testID="job-posting-message-suggestion-apply"
                            />
                        </View>
                    </AppCard>
                ) : null}
            </Section>

            <View style={[styles.privacyBox, {backgroundColor: c.surfaceMuted}]}>
                <AppText variant="caption" tone="secondary" style={styles.privacyText}>
                    소담 출퇴근 이력이 있어야 지원할 수 있어요. 지원을 수락하면 초대코드로 매장에 합류할 수 있어요.
                </AppText>
            </View>
        </ScreenContainer>
    );
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
        <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>{title}</AppText>
        {children}
    </View>
);

/** 시안 `.row`(라벨-값, 마지막 행은 하단 보더 없음) 1:1 — 근무일/시간 표기. */
const InfoRow: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.infoRow, {borderBottomColor: c.border}, last ? styles.infoRowLast : null]}>
            <AppText variant="bodyMd" tone="secondary">{label}</AppText>
            <AppText variant="bodyMd" weight="700">{value}</AppText>
        </View>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.lg, gap: spacing.xs},
    heroTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    heroNameFlex: {flex: 1, minWidth: 0},
    heroChip: {
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
    },
    heroSub: {opacity: 0.9},
    heroUrgencyChip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        marginTop: spacing.xs,
    },
    heroWageRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.xs,
        marginTop: spacing.md,
    },
    heroWageLabel: {opacity: 0.85},
    heroWageValue: {
        fontSize: 28,
        lineHeight: 33,
        fontFamily: Platform.select({ios: 'Menlo', android: 'monospace', default: 'monospace'}),
    },
    section: {marginBottom: spacing.lg, gap: spacing.xs},
    refineButton: {marginTop: spacing.sm},
    suggestionCard: {marginTop: spacing.sm, gap: spacing.sm},
    suggestionText: {lineHeight: 20},
    suggestionActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm},
    sectionTitle: {marginBottom: spacing.xs},
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm + 1,
        borderBottomWidth: 1,
    },
    infoRowLast: {borderBottomWidth: 0},
    privacyBox: {borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xxl},
    privacyText: {lineHeight: 18},
    footer: {
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        borderTopWidth: 1,
    },
    cta: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaPressed: {opacity: 0.94, transform: [{scale: 0.98}]},
});

export default JobPostingDetailScreen;
