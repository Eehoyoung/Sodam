/**
 * JobSeekerListScreen — [사장] 매장 반경 4km 구직자 리스트 (260711_작업통합.md Part 2 §7.4).
 *
 * 진입점: `OwnerDashboardScreen` "빠르게 하기" '주변 구직자·채용' 행(§18-9).
 * 상단 세그먼트 2개: 주변 구직자(이 화면 본체) / 우리 공고·지원자(Phase 6 자리만, §19.4).
 * 그 아래 유형 필터 세그먼트(전체/당일 대타/정기) — `?workType=` 쿼리로 재요청.
 *
 * 카드 탭 → `JobSeekerDetailScreen` push. 리스트 항목을 라우트 파라미터로 그대로 전달하므로
 * 상세 화면에서 추가 API 호출이 없다(§7.4-2).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useJobSeekers} from '../hooks/useRecruitmentQueries';
import {
    JOB_SEEKING_ERROR_MESSAGES,
    JobSeekerListItem,
    JobSeekingErrorCode,
    JobSeekingType,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, summarizeAvailability} from '../utils/formatAvailability';
import OurPostingScreen from './OurPostingScreen';

type TopTabKey = 'nearby' | 'ourPostings';
const TOP_TAB_LABELS = ['주변 구직자', '우리 공고·지원자'];

type TypeFilterKey = 'ALL' | JobSeekingType;
const TYPE_FILTER_KEYS: TypeFilterKey[] = ['ALL', 'SUBSTITUTE', 'REGULAR'];
const TYPE_FILTER_LABELS = ['전체', '당일 대타', '정기'];

function extractErrorCode(err: unknown): JobSeekingErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobSeekingErrorCode
        | undefined;
}

/** SUBSTITUTE 탭에서는 오늘 가능(availableToday=바로출근) 구직자를 상단으로 강조(§7.4 "바로출근 최상단 정렬"). */
function sortForTab(list: JobSeekerListItem[], typeFilter: TypeFilterKey): JobSeekerListItem[] {
    if (typeFilter !== 'SUBSTITUTE') {
        return list;
    }
    return [...list].sort((a, b) => Number(b.availableToday) - Number(a.availableToday));
}

const JobSeekerListScreen: React.FC = () => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'JobSeekerList'>>();
    const {storeId} = route.params;

    const [topTab, setTopTab] = useState<TopTabKey>('nearby');
    const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('ALL');

    const filters = useMemo(
        () => (typeFilter === 'ALL' ? undefined : {workType: typeFilter}),
        [typeFilter],
    );
    const {data, isLoading, isError, error, refetch} = useJobSeekers(storeId, filters);

    // 포커스마다 재조회 — 제안 발송(Phase 6) 등 쓰기 후 복귀 시 최신 반영(9화면 useFocusEffect 패턴).
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    // 세그먼트 전환('우리 공고·지원자' ↔ '주변 구직자') 시에도 최신 데이터를 다시 불러온다
    // (§10 Phase6 "세그먼트 전환마다 refetch" 신규 확정 패턴). 'ourPostings' 탭은 조건부 렌더로
    // 마운트되는 `OurPostingScreen` 자체 useFocusEffect 가 커버하므로, 여기서는 이 화면 최상단에서
    // 항상 구독 중인 `useJobSeekers` 쿼리만 'nearby' 재진입 시 명시적으로 재요청한다.
    useEffect(() => {
        if (topTab === 'nearby') {
            refetch();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topTab]);

    const list = useMemo(() => sortForTab(data ?? [], typeFilter), [data, typeFilter]);
    const errorCode = isError ? extractErrorCode(error) : undefined;
    const locationNotSet = errorCode === 'STORE_LOCATION_NOT_SET';

    const header = <AppHeader title="주변 구직자·채용" onBack={() => navigation.goBack()} />;

    return (
        <ScreenContainer header={header} scroll testID="job-seeker-list-screen">
            <View style={styles.body}>
                <SegmentedControl
                    options={TOP_TAB_LABELS}
                    value={topTab === 'nearby' ? 0 : 1}
                    onChange={i => setTopTab(i === 0 ? 'nearby' : 'ourPostings')}
                    style={styles.topSegment}
                />

                {topTab === 'ourPostings' ? (
                    <OurPostingScreen storeId={storeId} />
                ) : (
                    <>
                        <SegmentedControl
                            options={TYPE_FILTER_LABELS}
                            value={TYPE_FILTER_KEYS.indexOf(typeFilter)}
                            onChange={i => setTypeFilter(TYPE_FILTER_KEYS[i])}
                            style={styles.typeSegment}
                        />

                        {isLoading ? (
                            <LoadingState title="구직자 불러오는 중" description="잠시만 기다려 주세요" />
                        ) : isError ? (
                            locationNotSet ? (
                                <View testID="job-seeker-location-not-set">
                                    <ErrorState
                                        title="매장 위치를 먼저 설정해 주세요"
                                        description={JOB_SEEKING_ERROR_MESSAGES.STORE_LOCATION_NOT_SET}
                                        primary={{
                                            label: '위치 설정하러 가기',
                                            onPress: () => navigation.navigate('StoreEdit', {storeId}),
                                        }}
                                    />
                                </View>
                            ) : (
                                <ErrorState
                                    title="불러오지 못했어요"
                                    description="구직자 리스트를 가져오지 못했어요."
                                    primary={{label: '다시 시도', onPress: () => refetch()}}
                                />
                            )
                        ) : list.length === 0 ? (
                            <View testID="job-seeker-list-empty">
                                <EmptyState
                                    glyph={<Ionicons name="people-outline" size={26} color={c.textInverse} />}
                                    title="반경 4km 안에 구직중인 분이 아직 없어요"
                                    description="근처에 구직 중인 분이 생기면 여기에 표시돼요."
                                />
                            </View>
                        ) : (
                            <View style={styles.list} testID="job-seeker-list">
                                {list.map(seeker => (
                                    <JobSeekerCard
                                        key={seeker.userId}
                                        seeker={seeker}
                                        onPress={() =>
                                            navigation.navigate('JobSeekerDetail', {storeId, seeker})
                                        }
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>
        </ScreenContainer>
    );
};

interface JobSeekerCardProps {
    seeker: JobSeekerListItem;
    onPress: () => void;
}

const JobSeekerCard: React.FC<JobSeekerCardProps> = ({seeker, onPress}) => {
    const c = useThemeColors();
    const summary = summarizeAvailability(seeker.availability);

    return (
        <AppCard
            variant="flat"
            onPress={onPress}
            style={styles.card}
            testID={`job-seeker-card-${seeker.userId}`}>
            <View style={styles.cardTopRow}>
                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.nameText}>
                    {seeker.name}
                    {seeker.age !== null ? ` · ${seeker.age}세` : ''}
                </AppText>
                <AppText variant="caption" style={{color: recruit.primary}}>
                    {formatDistanceKm(seeker.distanceMeters)}
                </AppText>
            </View>

            {seeker.currentEmployment ? (
                <AppText variant="caption" tone="secondary">
                    {seeker.currentEmployment.storeName} · {seeker.currentEmployment.hireDate} ~ 현재
                </AppText>
            ) : (
                <AppBadge label="휴직중" tone="neutral" style={styles.badgeGap} />
            )}

            <View style={styles.badgeRow}>
                {seeker.categoryMatched ? <AppBadge label="업종 일치" tone="success" /> : null}
                {seeker.seekingTypes.map(type => (
                    <AppBadge key={type} label={SEEKING_TYPE_LABELS[type]} tone="info" />
                ))}
                {seeker.availableToday ? <AppBadge label="오늘 가능" tone="warning" /> : null}
            </View>

            {summary ? (
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {summary}
                </AppText>
            ) : null}

            {seeker.desiredLocations.length > 0 ? (
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={c.textTertiary} />
                    <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.locationText}>
                        {seeker.desiredLocations.join(' · ')}
                    </AppText>
                </View>
            ) : null}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    body: {gap: spacing.md, paddingBottom: spacing.xxl},
    topSegment: {marginBottom: spacing.sm},
    typeSegment: {marginBottom: spacing.md},
    list: {gap: spacing.sm},
    card: {gap: spacing.xs},
    cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    nameText: {flex: 1, minWidth: 0},
    badgeGap: {marginTop: 2},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs},
    locationRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2},
    locationText: {flex: 1, minWidth: 0},
});

export default JobSeekerListScreen;
