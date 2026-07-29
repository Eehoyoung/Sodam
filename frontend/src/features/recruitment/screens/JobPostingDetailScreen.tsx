/**
 * JobPostingDetailScreen — [직원] 구인 공고 상세·지원 (260711_작업통합.md Part 2 §19.4 R-17, Phase 6).
 *
 * 진입점: `NearbyJobPostingsScreen`(R-16) 카드 탭 → push 전환. 라우트 파라미터로 리스트 항목
 * (`JobPostingNearbyItem`)을 그대로 전달받는다 — `JobSeekerDetailScreen`(§7.4-2)과 동일하게
 * 추가 조회 API 없음(v1). 선택 메시지 입력 후 "지원하기" 버튼으로 지원한다(§19.1).
 *
 * 히어로는 v3 시안(sodam-v3-07-recruitment.html R3)에 맞춰 흰 배경 + 회색 테두리(--border)
 * spot 카드로 구성한다(§7.0 다크배경 금지 원칙은 유지 — 그라디언트 대신 화이트 카드로 충족).
 * ⚠️ 2026-07-11 초안 주석은 이 테두리를 "recruit 그린"이라 잘못 인용했었다 — 실제 아티팩트의
 * `.spot-card`는 중립 회색 테두리이고, 색이 들어가는 요소는 시급 강조용 `.money-card`(22px
 * 모노스페이스, 코랄과 무관한 중립 카드)와 지원하기 CTA(코랄)뿐이다. 2026-07-20 확정에 따라
 * 코랄(#FF4D6D, `c.brandPrimary`)만 액션 강조로 사용하고 recruit 그린 토큰은 참조하지 않는다.
 */
import React, {useState} from 'react';
import {Platform, Pressable, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppBadge, AppHeader, AppInput, AppText, AppToast, ScreenContainer} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useApplyToJobPosting} from '../hooks/useRecruitmentQueries';
import {
    JOB_APPLICATION_ERROR_MESSAGES,
    JOB_CATEGORY_LABELS,
    JobApplicationErrorCode,
    JobPostingNearbyItem,
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

interface Props {
    /** 개발용 시각 검증 전용 — route.params 없이도 posting을 지정한다. */
    visualFixture?: {posting: JobPostingNearbyItem};
}

const JobPostingDetailScreen: React.FC<Props> = ({visualFixture}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobPostingDetail'>>();
    const posting = visualFixture?.posting ?? route.params.posting;
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
                            {backgroundColor: applied ? c.surfaceMuted : c.brandPrimary},
                            pressed && !applyMutation.isPending && !applied ? styles.ctaPressed : null,
                        ]}>
                        <AppText variant="bodyLg" weight="700" style={{color: applied ? c.textSecondary : c.textInverse}}>
                            {applied ? '지원 완료' : '지원하기'}
                        </AppText>
                    </Pressable>
                </View>
            }>
            <View
                style={[styles.hero, {backgroundColor: c.background, borderColor: c.border}]}
                testID="job-posting-hero-card">
                <View style={styles.heroTopRow}>
                    <AppText variant="headingSm" weight="800" numberOfLines={1} style={styles.heroNameFlex}>
                        {posting.storeName}
                    </AppText>
                    <AppBadge label={SEEKING_TYPE_LABELS[posting.workType]} tone="info" />
                </View>
                <AppText variant="bodyMd" tone="secondary">
                    {formatDistanceKm(posting.distanceMeters)} · {JOB_CATEGORY_LABELS[posting.jobCategory]}
                </AppText>
            </View>

            <Section title="근무 정보">
                <InfoRow label="근무일" value={posting.workDate ?? '수시'} />
                <InfoRow label="시간" value={formatTimeRange(posting.startTime, posting.endTime)} last />
            </Section>

            {/* 시급 강조 박스 — v3 시안 R3 `.money-card`(22px 모노스페이스) 1:1 재현 */}
            <View style={[styles.moneyCard, {backgroundColor: c.background, borderColor: c.border}]} testID="job-posting-money-card">
                <AppText variant="caption" tone="secondary" style={styles.moneyLabel}>시급</AppText>
                <AppText weight="800" style={[styles.moneyValue, {color: c.textPrimary}]}>
                    {posting.hourlyWage.toLocaleString('ko-KR')}원
                </AppText>
            </View>

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
    hero: {
        borderRadius: radius.xxl,
        borderWidth: 1.5,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        gap: spacing.xs,
    },
    heroTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    heroNameFlex: {flex: 1, minWidth: 0},
    section: {marginBottom: spacing.lg, gap: spacing.xs},
    sectionTitle: {marginBottom: spacing.xs},
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm + 1,
        borderBottomWidth: 1,
    },
    infoRowLast: {borderBottomWidth: 0},
    moneyCard: {
        borderWidth: 1,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    moneyLabel: {marginBottom: spacing.xs},
    moneyValue: {
        fontSize: 22,
        lineHeight: 27,
        fontFamily: Platform.select({ios: 'Menlo', android: 'monospace', default: 'monospace'}),
    },
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
