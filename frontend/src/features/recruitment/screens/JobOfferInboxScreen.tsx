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
 *
 * 재조회 전략(FE-DUP 수정, findings_report.md §4.1): `useMyJobOffers`/`useMyJobApplications` 는
 * `staleTime: 0` 이라 TanStack Query 기본 `refetchOnMount` 만으로 마운트마다 항상 재조회된다.
 * 이 화면은 허브(`EmployeeRecruitmentScreen`) 탭 전환마다 조건부 렌더로 매번 새로 마운트되므로
 * 별도 `useFocusEffect(refetch)` 조합 없이 이 자동 동작만으로 "탭 전환마다 재조회"가 충족된다 —
 * 예전에는 여기에 수동 `useFocusEffect` 를 얹어 마운트 자동조회 + 포커스 refetch 가 겹쳐 최초
 * 진입 시 API가 2회씩(제안·지원 각각) 중복 호출됐다. 응답(`useRespondToJobOffer`) 뮤테이션은
 * 성공 시 `myOffers` 쿼리를 invalidate 하므로, 이 화면이 마운트돼 있는 동안 응답을 처리해도
 * 리스트가 자동으로 최신화된다(쓰기 후 별도 refetch 불필요).
 */
import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppBadge, AppCard, AppText, AppToast, EmptyState, ErrorState, LoadingState} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {radius, spacing} from '../../../theme/tokens';
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

interface Props {
    /** 개발용 시각 검증 전용 — 실 API 대신 고정 데이터를 표시한다.
     * nowMs를 함께 고정해 formatRemaining의 "남은 시간" 텍스트가 캡처 시각에 따라 흔들리지 않게 한다. */
    visualFixture?: {offers: JobOffer[]; applications: JobApplication[]; nowMs?: number};
}
import {formatTimeRange} from '../utils/formatAvailability';
import {formatRemaining, remainingMs} from '../utils/remainingTime';

/** 응답 만료 3시간 이내면 긴급(경고 톤)으로 카운트다운 배지를 강조한다. */
const URGENT_REMAINING_MS = 3 * 60 * 60 * 1000;

function isUrgent(expiresAt: string, nowMs?: number): boolean {
    return remainingMs(expiresAt, nowMs) <= URGENT_REMAINING_MS;
}

function extractErrorMessage(err: unknown): string | undefined {
    return (err as {response?: {data?: {message?: string}}})?.response?.data?.message;
}

const JobOfferInboxScreen: React.FC<Props> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const offersQuery = useMyJobOffers(!visualFixture);
    const applicationsQuery = useMyJobApplications(!visualFixture);
    const respondMutation = useRespondToJobOffer();
    const [, setTick] = useState(0);

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
    const goToChat = () => navigation.navigate('ChatRoomList');

    const offers = visualFixture?.offers ?? offersQuery.data ?? [];
    const applications = visualFixture?.applications ?? applicationsQuery.data ?? [];
    const loading = !visualFixture && (offersQuery.isLoading || applicationsQuery.isLoading);

    if (loading) {
        return <LoadingState title="채용함 불러오는 중" description="잠시만 기다려 주세요" />;
    }

    if (!visualFixture && offersQuery.isError && applicationsQuery.isError) {
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

    // 상태별 카운트 배지(§6.2 "탭별 카운트 배지") — 이 화면은 탭이 아니라 "받은 제안"/"내 지원 현황"
    // 두 섹션을 한 화면에 통합 노출하는 구조라(§15.5 R-12/R-13), 제안+지원을 합쳐 상태별 요약으로
    // 대체한다.
    const allEntries = [...offers, ...applications];
    const pendingCount = allEntries.filter(e => e.status === 'PENDING').length;
    const acceptedCount = allEntries.filter(e => e.status === 'ACCEPTED').length;
    const declinedCount = allEntries.filter(e => e.status === 'DECLINED').length;

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
                    <View style={styles.summaryRow} testID="job-offer-inbox-summary">
                        {pendingCount > 0 ? <AppBadge label={`대기 ${pendingCount}`} tone="warning" /> : null}
                        {acceptedCount > 0 ? <AppBadge label={`수락 ${acceptedCount}`} tone="success" /> : null}
                        {declinedCount > 0 ? <AppBadge label={`거절 ${declinedCount}`} tone="neutral" /> : null}
                    </View>

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
                                    onChat={goToChat}
                                    nowMs={visualFixture?.nowMs}
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
                                <ApplicationCard key={app.id} application={app} onJoin={goToJoinStore} onChat={goToChat} />
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
    onChat: () => void;
    /** 개발용 시각 검증 전용 — formatRemaining 계산 기준 시각을 고정한다. */
    nowMs?: number;
}

const OfferCard: React.FC<OfferCardProps> = ({offer, responding, onAccept, onDecline, onJoin, onChat, nowMs}) => {
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
                <View style={[styles.messageBox, {backgroundColor: c.surfaceMuted}]}>
                    <AppText variant="caption" tone="secondary" numberOfLines={2}>"{offer.message}"</AppText>
                </View>
            ) : null}

            {offer.status === 'PENDING' ? (
                <>
                    {/* 응답 만료 카운트다운 배지(§6.2) — 3시간 이내면 경고 톤으로 긴급함을 강조한다. */}
                    <View
                        style={[
                            styles.countdownChip,
                            {backgroundColor: isUrgent(offer.expiresAt, nowMs) ? c.warningBg : c.brandPrimarySoft},
                        ]}
                        testID={`job-offer-remaining-${offer.id}`}>
                        <AppText
                            variant="caption"
                            weight="700"
                            style={{color: isUrgent(offer.expiresAt, nowMs) ? c.warning : c.brandPrimary}}>
                            {nowMs !== undefined ? formatRemaining(offer.expiresAt, nowMs) : formatRemaining(offer.expiresAt)}
                        </AppText>
                    </View>
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
                            style={[styles.actionBtn, {backgroundColor: c.brandPrimary}]}>
                            <AppText variant="bodyMd" weight="700" style={{color: c.textInverse}}>수락</AppText>
                        </Pressable>
                    </View>
                </>
            ) : null}

            {offer.status === 'ACCEPTED' ? (
                <>
                    {offer.storeCode ? (
                        <InviteCodeBanner storeCode={offer.storeCode} onJoin={onJoin} testIDPrefix={`job-offer-${offer.id}`} />
                    ) : null}
                    <ChatEntryButton onPress={onChat} testID={`job-offer-${offer.id}-chat-button`} />
                </>
            ) : null}
        </AppCard>
    );
};

interface ApplicationCardProps {
    application: JobApplication;
    onJoin: () => void;
    onChat: () => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({application, onJoin, onChat}) => (
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

        {application.status === 'ACCEPTED' ? (
            <>
                {application.storeCode ? (
                    <InviteCodeBanner
                        storeCode={application.storeCode}
                        onJoin={onJoin}
                        testIDPrefix={`job-application-${application.id}`}
                    />
                ) : null}
                <ChatEntryButton onPress={onChat} testID={`job-application-${application.id}-chat-button`} />
            </>
        ) : null}
    </AppCard>
);

/** 매칭 성립(ACCEPTED) 건에서 채팅방 목록으로 이동하는 CTA(§4, Phase D) — 단건 채팅방 id 를
 * 내려주는 API가 없어(§7.4-2 와 달리 채팅방은 별도 단건 조회 엔드포인트가 없다) 목록 화면으로
 * 이동시키고 사용자가 상대를 골라 들어가게 한다. */
const ChatEntryButton: React.FC<{onPress: () => void; testID: string}> = ({onPress, testID}) => {
    const c = useThemeColors();
    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            accessibilityRole="button"
            style={[styles.chatBtn, {borderColor: c.brandPrimary}]}>
            <AppText variant="bodyMd" weight="700" style={{color: c.brandPrimary}}>채팅하기</AppText>
        </Pressable>
    );
};

const InviteCodeBanner: React.FC<{storeCode: string; onJoin: () => void; testIDPrefix: string}> = ({
    storeCode,
    onJoin,
    testIDPrefix,
}) => {
    const c = useThemeColors();
    // 초대코드 배너 = 틸(v3 시안 R2 초대코드 info-card: background/border/text 모두 --teal 계열)
    return (
        <View style={[styles.inviteBanner, {backgroundColor: c.successBg}]} testID={`${testIDPrefix}-invite-banner`}>
            <AppText variant="bodyMd" weight="700" style={{color: c.success}}>
                초대코드: {storeCode}
            </AppText>
            <Pressable
                testID={`${testIDPrefix}-join-button`}
                onPress={onJoin}
                accessibilityRole="button"
                style={[styles.joinBtn, {backgroundColor: c.success}]}>
                <AppText variant="bodyMd" weight="700" style={{color: c.textInverse}}>매장 가입하기</AppText>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xxl},
    summaryRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs},
    countdownChip: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
    },
    sectionTitle: {marginBottom: spacing.xs},
    sectionTitleGap: {marginTop: spacing.lg, marginBottom: spacing.xs},
    emptySection: {marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    card: {gap: spacing.xs},
    cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flex1: {flex: 1, minWidth: 0},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    messageBox: {borderRadius: 10, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.sm},
    actionRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm},
    actionBtn: {flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    declineBtn: {borderWidth: 1},
    inviteBanner: {borderRadius: 14, padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm},
    joinBtn: {minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
    chatBtn: {
        minHeight: 44,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
});

export default JobOfferInboxScreen;
