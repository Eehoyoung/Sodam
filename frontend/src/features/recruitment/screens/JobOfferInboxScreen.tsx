/**
 * JobOfferInboxScreen — [직원] 채용함 (260711_작업통합.md Part 2 §15.5 R-12/R-13 + §19.4 "채용함").
 *
 * `EmployeeRecruitmentScreen` 허브의 "채용함" 탭 본문으로 임베드된다(구직 설정 탭이
 * `JobSeekingSettingsScreen` 을 임베드하는 것과 동일 패턴). 받은 채용 제안(§15)과 내 지원 현황
 * (§19)을 한 화면에 통합 노출한다(Phase 6 프롬프트 지시사항 #5) — 각 상태(대기/수락/거절/만료)를
 * 뱃지로 표시하고, 대기중 제안에는 남은 응답시간 타이머(§16.1-5)를 붙인다.
 *
 * 수락 시(제안·지원 공통) 매장 초대코드가 노출되며(R-13, PII 최소화로 수락 후에만 응답에 포함),
 * "매장 가입하기" 버튼은 기존 `JoinStoreByCode` 화면으로 네비게이션만 한다(그 화면 내부 로직은
 * 건드리지 않는다 — 코드값은 자동 프리필되지 않으므로 화면에 코드를 표시해 사용자가 직접 입력한다).
 */
import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppBadge, AppCard, AppText, AppToast, EmptyState, ErrorState, LoadingState} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useMyJobApplications, useMyJobOffers, useRespondToJobOffer} from '../hooks/useRecruitmentQueries';
import {
    JOB_CATEGORY_LABELS,
    JOB_RESPONSE_STATUS_LABELS,
    JOB_RESPONSE_STATUS_TONE,
    JobApplication,
    JobOffer,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatTimeRange} from '../utils/formatAvailability';
import {formatRemaining} from '../utils/remainingTime';

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

const JobOfferInboxScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const offersQuery = useMyJobOffers();
    const applicationsQuery = useMyJobApplications();
    const respondMutation = useRespondToJobOffer();
    const [, setTick] = useState(0);

    useFocusEffect(
        useCallback(() => {
            offersQuery.refetch();
            applicationsQuery.refetch();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []),
    );

    // 대기중 제안의 남은 시간 표기를 1분마다 재계산(값 자체는 항상 현재 시각을 다시 계산 — drift 없음).
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const handleRespond = async (offerId: number, accept: boolean) => {
        try {
            await respondMutation.mutateAsync({offerId, accept});
            AppToast.success(accept ? '제안을 수락했어요.' : '제안을 거절했어요.');
        } catch (err: unknown) {
            AppToast.error(extractErrorMessage(err) ?? '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
        }
    };

    const goToJoinStore = () => navigation.navigate('JoinStoreByCode');

    const offers = offersQuery.data ?? [];
    const applications = applicationsQuery.data ?? [];
    const loading = offersQuery.isLoading || applicationsQuery.isLoading;

    if (loading) {
        return <LoadingState title="채용함 불러오는 중" description="잠시만 기다려 주세요" />;
    }

    if (offersQuery.isError && applicationsQuery.isError) {
        return (
            <ErrorState
                title="불러오지 못했어요"
                description="채용함 정보를 가져오지 못했어요."
                primary={{
                    label: '다시 시도',
                    onPress: () => {
                        offersQuery.refetch();
                        applicationsQuery.refetch();
                    },
                }}
            />
        );
    }

    const bothEmpty = offers.length === 0 && applications.length === 0;

    return (
        <View style={styles.container} testID="job-offer-inbox-screen">
            {bothEmpty ? (
                <View testID="job-offer-inbox-empty">
                    <EmptyState
                        title="아직 받은 제안·지원 내역이 없어요"
                        description="사장님의 제안을 받거나 공고에 지원하면 여기에 표시돼요."
                    />
                </View>
            ) : (
                <>
                    <AppText variant="titleMd" weight="700" style={styles.sectionTitle}>받은 제안</AppText>
                    {offers.length === 0 ? (
                        <AppText variant="bodyMd" tone="secondary" style={styles.emptySection}>받은 제안이 없어요.</AppText>
                    ) : (
                        <View style={styles.list} testID="job-offer-list">
                            {offers.map(offer => (
                                <OfferCard
                                    key={offer.id}
                                    offer={offer}
                                    responding={respondMutation.isPending}
                                    onAccept={() => handleRespond(offer.id, true)}
                                    onDecline={() => handleRespond(offer.id, false)}
                                    onJoin={goToJoinStore}
                                />
                            ))}
                        </View>
                    )}

                    <AppText variant="titleMd" weight="700" style={styles.sectionTitleGap}>내 지원 현황</AppText>
                    {applications.length === 0 ? (
                        <AppText variant="bodyMd" tone="secondary" style={styles.emptySection}>지원한 공고가 없어요.</AppText>
                    ) : (
                        <View style={styles.list} testID="job-application-list">
                            {applications.map(app => (
                                <ApplicationCard key={app.id} application={app} onJoin={goToJoinStore} />
                            ))}
                        </View>
                    )}
                </>
            )}
        </View>
    );
};

interface OfferCardProps {
    offer: JobOffer;
    responding: boolean;
    onAccept: () => void;
    onDecline: () => void;
    onJoin: () => void;
}

const OfferCard: React.FC<OfferCardProps> = ({offer, responding, onAccept, onDecline, onJoin}) => {
    const c = useThemeColors();
    return (
        <AppCard variant="flat" style={styles.card} testID={`job-offer-card-${offer.id}`}>
            <View style={styles.cardTopRow}>
                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.flex1}>
                    {offer.storeName}
                </AppText>
                <AppBadge label={JOB_RESPONSE_STATUS_LABELS[offer.status]} tone={JOB_RESPONSE_STATUS_TONE[offer.status]} />
            </View>

            <View style={styles.badgeRow}>
                <AppBadge label={SEEKING_TYPE_LABELS[offer.workType]} tone="info" />
            </View>

            <AppText variant="bodyMd" tone="secondary">
                {offer.workDate ? `${offer.workDate} · ` : ''}
                {formatTimeRange(offer.startTime, offer.endTime)} · 시급 {offer.hourlyWage.toLocaleString('ko-KR')}원
            </AppText>

            {offer.message ? (
                <AppText variant="caption" tone="tertiary" numberOfLines={2}>"{offer.message}"</AppText>
            ) : null}

            {offer.status === 'PENDING' ? (
                <>
                    <AppText variant="caption" style={{color: recruit.primary}} testID={`job-offer-remaining-${offer.id}`}>
                        {formatRemaining(offer.expiresAt)}
                    </AppText>
                    <View style={styles.actionRow}>
                        <Pressable
                            testID={`job-offer-decline-${offer.id}`}
                            onPress={onDecline}
                            disabled={responding}
                            accessibilityRole="button"
                            style={[styles.actionBtn, styles.declineBtn, {borderColor: c.border}]}>
                            <AppText variant="bodyMd" weight="700" tone="secondary">거절</AppText>
                        </Pressable>
                        <Pressable
                            testID={`job-offer-accept-${offer.id}`}
                            onPress={onAccept}
                            disabled={responding}
                            accessibilityRole="button"
                            style={[styles.actionBtn, {backgroundColor: recruit.primary}]}>
                            <AppText variant="bodyMd" weight="700" style={{color: c.textInverse}}>수락</AppText>
                        </Pressable>
                    </View>
                </>
            ) : null}

            {offer.status === 'ACCEPTED' && offer.storeCode ? (
                <InviteCodeBanner storeCode={offer.storeCode} onJoin={onJoin} testIDPrefix={`job-offer-${offer.id}`} />
            ) : null}
        </AppCard>
    );
};

interface ApplicationCardProps {
    application: JobApplication;
    onJoin: () => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({application, onJoin}) => (
    <AppCard variant="flat" style={styles.card} testID={`job-application-card-${application.id}`}>
        <View style={styles.cardTopRow}>
            <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.flex1}>
                {application.storeName}
            </AppText>
            <AppBadge
                label={JOB_RESPONSE_STATUS_LABELS[application.status]}
                tone={JOB_RESPONSE_STATUS_TONE[application.status]}
            />
        </View>

        <View style={styles.badgeRow}>
            <AppBadge label={SEEKING_TYPE_LABELS[application.workType]} tone="info" />
            <AppBadge label={JOB_CATEGORY_LABELS[application.jobCategory]} tone="neutral" />
        </View>

        <AppText variant="bodyMd" tone="secondary">
            {application.workDate ? `${application.workDate} · ` : ''}
            {formatTimeRange(application.startTime, application.endTime)} · 시급{' '}
            {application.hourlyWage.toLocaleString('ko-KR')}원
        </AppText>

        {application.status === 'ACCEPTED' && application.storeCode ? (
            <InviteCodeBanner
                storeCode={application.storeCode}
                onJoin={onJoin}
                testIDPrefix={`job-application-${application.id}`}
            />
        ) : null}
    </AppCard>
);

const InviteCodeBanner: React.FC<{storeCode: string; onJoin: () => void; testIDPrefix: string}> = ({
    storeCode,
    onJoin,
    testIDPrefix,
}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.inviteBanner, {backgroundColor: recruit.primarySoft}]} testID={`${testIDPrefix}-invite-banner`}>
            <AppText variant="bodyMd" weight="700" style={{color: recruit.primary}}>
                초대코드: {storeCode}
            </AppText>
            <Pressable
                testID={`${testIDPrefix}-join-button`}
                onPress={onJoin}
                accessibilityRole="button"
                style={[styles.joinBtn, {backgroundColor: recruit.primary}]}>
                <AppText variant="bodyMd" weight="700" style={{color: c.textInverse}}>매장 가입하기</AppText>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xxl},
    sectionTitle: {marginBottom: spacing.xs},
    sectionTitleGap: {marginTop: spacing.lg, marginBottom: spacing.xs},
    emptySection: {marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    card: {gap: spacing.xs},
    cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flex1: {flex: 1, minWidth: 0},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
    actionBtn: {flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    declineBtn: {borderWidth: 1},
    inviteBanner: {borderRadius: 14, padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm},
    joinBtn: {minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
});

export default JobOfferInboxScreen;
