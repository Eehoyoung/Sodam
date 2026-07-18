/**
 * JobPostingDetailScreen — [직원] 구인 공고 상세·지원 (260711_작업통합.md Part 2 §19.4 R-17, Phase 6).
 *
 * 진입점: `NearbyJobPostingsScreen`(R-16) 카드 탭 → push 전환. 라우트 파라미터로 리스트 항목
 * (`JobPostingNearbyItem`)을 그대로 전달받는다 — `JobSeekerDetailScreen`(§7.4-2)과 동일하게
 * 추가 조회 API 없음(v1). 선택 메시지 입력 후 "지원하기" 버튼으로 지원한다(§19.1).
 *
 * 히어로는 그린 그라디언트(`recruit.gradient`, §7.0 다크배경 금지) + 화이트 텍스트.
 */
import React, {useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {AppHeader, AppInput, AppText, AppToast, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useApplyToJobPosting} from '../hooks/useRecruitmentQueries';
import {
    JOB_APPLICATION_ERROR_MESSAGES,
    JOB_CATEGORY_LABELS,
    JobApplicationErrorCode,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, formatTimeRange} from '../utils/formatAvailability';

function extractErrorCode(err: unknown): JobApplicationErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobApplicationErrorCode
        | undefined;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

const JobPostingDetailScreen: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobPostingDetail'>>();
    const {posting} = route.params;
    const [message, setMessage] = useState('');
    const [applied, setApplied] = useState(false);
    const applyMutation = useApplyToJobPosting();

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
                            {backgroundColor: applied ? c.surfaceMuted : recruit.primary},
                            pressed && !applyMutation.isPending && !applied ? styles.ctaPressed : null,
                        ]}>
                        <AppText variant="bodyLg" weight="700" style={{color: applied ? c.textSecondary : c.textInverse}}>
                            {applied ? '지원 완료' : '지원하기'}
                        </AppText>
                    </Pressable>
                </View>
            }>
            <LinearGradient
                colors={recruit.gradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.hero}
                testID="job-posting-hero-gradient">
                <AppText variant="headingSm" style={styles.heroName}>
                    {posting.storeName}
                </AppText>
                <AppText variant="bodyMd" style={styles.heroSub}>
                    {formatDistanceKm(posting.distanceMeters)} · {JOB_CATEGORY_LABELS[posting.jobCategory]}
                </AppText>
                <View style={styles.heroBadgeRow}>
                    <HeroPill label={SEEKING_TYPE_LABELS[posting.workType]} />
                </View>
            </LinearGradient>

            <Section title="근무 정보">
                <AppText variant="bodyMd" tone="secondary">
                    {posting.workDate ? `${posting.workDate} · ` : ''}
                    {formatTimeRange(posting.startTime, posting.endTime)}
                </AppText>
                <AppText variant="bodyMd" tone="secondary" style={styles.wageText}>
                    시급 {posting.hourlyWage.toLocaleString('ko-KR')}원
                </AppText>
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
                    onChangeText={v => setMessage(v.slice(0, 200))}
                    placeholder="예: 평일 저녁 근무 가능합니다."
                    multiline
                    editable={!applied}
                />
            </Section>

            <AppText variant="caption" tone="tertiary" style={styles.privacy}>
                소담 출퇴근 이력이 있어야 지원할 수 있어요. 지원을 수락하면 초대코드로 매장에 합류할 수 있어요.
            </AppText>
        </ScreenContainer>
    );
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <View style={styles.section}>
        <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>{title}</AppText>
        {children}
    </View>
);

const HeroPill: React.FC<{label: string}> = ({label}) => (
    <View style={styles.heroPill}>
        <AppText variant="caption" weight="700" style={styles.heroPillText}>{label}</AppText>
    </View>
);

const styles = StyleSheet.create({
    hero: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    heroName: {color: '#FFFFFF'},
    heroSub: {color: 'rgba(255,255,255,0.92)'},
    heroBadgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm},
    heroPill: {
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 6,
        borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    heroPillText: {color: '#FFFFFF'},
    section: {marginBottom: spacing.lg, gap: spacing.xs},
    sectionTitle: {marginBottom: spacing.xs},
    wageText: {marginTop: 2},
    privacy: {lineHeight: 18, paddingHorizontal: 2, marginBottom: spacing.xxl},
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
