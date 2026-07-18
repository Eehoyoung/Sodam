/**
 * NearbyJobPostingsScreen — [직원] 주변 구인 (260711_작업통합.md Part 2 §19.4 R-16, Phase 6).
 *
 * `EmployeeRecruitmentScreen` 허브의 "주변 구인" 탭 본문으로 임베드된다(구직 설정 탭이
 * `JobSeekingSettingsScreen` 을 임베드하는 것과 동일 패턴).
 *
 * 내 희망지역(§2 #4) 기준 4km 이내 open 공고를 유형·업종 필터로 좁혀 리스트로 보여주고,
 * 카드 탭 → `JobPostingDetailScreen`(R-17)으로 push(추가 조회 없이 항목을 그대로 전달).
 * 희망지역 미설정이면(`JOB_SEEKING_LOCATIONS_REQUIRED`) 구직 설정 탭으로 유도한다.
 *
 * 재조회 전략(FE-DUP 수정, findings_report.md §4.1): `useNearbyJobPostings` 는 `staleTime: 0` —
 * 허브 탭 전환마다 조건부 렌더로 매번 새로 마운트되므로 TanStack Query 기본 `refetchOnMount` 만으로
 * 매 진입마다 재조회된다. 예전에는 여기에 수동 `useFocusEffect(refetch)` 를 얹어 마운트 자동조회와
 * 겹쳐 최초 진입 시 API가 2회 중복 호출됐다.
 */
import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppCard,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    SegmentedControl,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useNearbyJobPostings} from '../hooks/useRecruitmentQueries';
import {
    JOB_CATEGORY_CODES,
    JOB_CATEGORY_LABELS,
    JOB_SEEKING_ERROR_MESSAGES,
    JobCategoryCode,
    JobPostingNearbyItem,
    JobSeekingErrorCode,
    JobSeekingType,
    SEEKING_TYPE_LABELS,
} from '../types';
import {formatDistanceKm, formatTimeRange} from '../utils/formatAvailability';

type TypeFilterKey = 'ALL' | JobSeekingType;
const TYPE_FILTER_KEYS: TypeFilterKey[] = ['ALL', 'SUBSTITUTE', 'REGULAR'];
const TYPE_FILTER_LABELS = ['전체', '당일 대타', '정기'];

type CategoryFilterKey = 'ALL' | JobCategoryCode;

function extractErrorCode(err: unknown): JobSeekingErrorCode | undefined {
    return (err as {response?: {data?: {errorCode?: string}}})?.response?.data?.errorCode as
        | JobSeekingErrorCode
        | undefined;
}

interface NearbyJobPostingsScreenProps {
    /** 희망지역 미설정 안내에서 "구직 설정" 탭으로 이동시키는 콜백(허브가 tabIndex 를 소유). */
    onGoToProfileTab: () => void;
}

const NearbyJobPostingsScreen: React.FC<NearbyJobPostingsScreenProps> = ({onGoToProfileTab}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const [typeFilter, setTypeFilter] = useState<TypeFilterKey>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilterKey>('ALL');

    const filters = useMemo(
        () => ({
            workType: typeFilter === 'ALL' ? undefined : typeFilter,
            category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        }),
        [typeFilter, categoryFilter],
    );
    const {data, isLoading, isError, error, refetch} = useNearbyJobPostings(filters);

    const list = data ?? [];
    const errorCode = isError ? extractErrorCode(error) : undefined;
    const locationsRequired = errorCode === 'JOB_SEEKING_LOCATIONS_REQUIRED';

    return (
        <View style={styles.container} testID="nearby-job-postings-screen">
            <SegmentedControl
                options={TYPE_FILTER_LABELS}
                value={TYPE_FILTER_KEYS.indexOf(typeFilter)}
                onChange={i => setTypeFilter(TYPE_FILTER_KEYS[i])}
                style={styles.typeSegment}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <CategoryChip
                    label="전체"
                    selected={categoryFilter === 'ALL'}
                    onPress={() => setCategoryFilter('ALL')}
                    testID="nearby-posting-category-chip-ALL"
                />
                {JOB_CATEGORY_CODES.map(code => (
                    <CategoryChip
                        key={code}
                        label={JOB_CATEGORY_LABELS[code]}
                        selected={categoryFilter === code}
                        onPress={() => setCategoryFilter(code)}
                        testID={`nearby-posting-category-chip-${code}`}
                    />
                ))}
            </ScrollView>

            {isLoading ? (
                <LoadingState title="주변 구인 불러오는 중" description="잠시만 기다려 주세요" />
            ) : isError ? (
                locationsRequired ? (
                    <View testID="nearby-posting-locations-required">
                        <ErrorState
                            title="희망지역을 먼저 설정해 주세요"
                            description={JOB_SEEKING_ERROR_MESSAGES.JOB_SEEKING_LOCATIONS_REQUIRED}
                            primary={{label: '구직 설정하러 가기', onPress: onGoToProfileTab}}
                        />
                    </View>
                ) : (
                    <ErrorState
                        title="불러오지 못했어요"
                        description="주변 구인 공고를 가져오지 못했어요."
                        primary={{label: '다시 시도', onPress: () => refetch()}}
                    />
                )
            ) : list.length === 0 ? (
                <View testID="nearby-posting-empty">
                    <EmptyState
                        glyph={<Ionicons name="briefcase-outline" size={26} color={c.textInverse} />}
                        title="반경 4km 안에 열린 공고가 없어요"
                        description="근처에 구인중인 매장이 생기면 여기에 표시돼요."
                    />
                </View>
            ) : (
                <View style={styles.list} testID="nearby-posting-list">
                    {list.map(posting => (
                        <NearbyPostingCard
                            key={posting.postingId}
                            posting={posting}
                            onPress={() => navigation.navigate('JobPostingDetail', {posting})}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const CategoryChip: React.FC<{label: string; selected: boolean; onPress: () => void; testID: string}> = ({
    label,
    selected,
    onPress,
    testID,
}) => {
    const c = useThemeColors();
    return (
        <Pressable
            testID={testID}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{selected}}
            style={[
                styles.categoryChip,
                {
                    borderColor: selected ? recruit.primary : c.border,
                    backgroundColor: selected ? recruit.primarySoft : c.background,
                },
            ]}>
            <AppText variant="bodyMd" weight="700" style={{color: selected ? recruit.primary : c.textSecondary}}>
                {label}
            </AppText>
        </Pressable>
    );
};

interface NearbyPostingCardProps {
    posting: JobPostingNearbyItem;
    onPress: () => void;
}

const NearbyPostingCard: React.FC<NearbyPostingCardProps> = ({posting, onPress}) => {
    const timeRange = formatTimeRange(posting.startTime, posting.endTime);
    return (
        <AppCard
            variant="flat"
            onPress={onPress}
            style={styles.card}
            testID={`nearby-posting-card-${posting.postingId}`}>
            <View style={styles.cardTopRow}>
                <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.flex1}>
                    {posting.storeName}
                </AppText>
                <AppText variant="caption" style={{color: recruit.primary}}>
                    {formatDistanceKm(posting.distanceMeters)}
                </AppText>
            </View>

            <View style={styles.badgeRow}>
                <AppBadge label={SEEKING_TYPE_LABELS[posting.workType]} tone="info" />
                <AppBadge label={JOB_CATEGORY_LABELS[posting.jobCategory]} tone="neutral" />
            </View>

            <AppText variant="bodyMd" tone="secondary">
                {posting.workDate ? `${posting.workDate} · ` : ''}
                {timeRange} · 시급 {posting.hourlyWage.toLocaleString('ko-KR')}원
            </AppText>

            {posting.message ? (
                <AppText variant="caption" tone="tertiary" numberOfLines={2}>
                    {posting.message}
                </AppText>
            ) : null}
        </AppCard>
    );
};

const styles = StyleSheet.create({
    container: {gap: spacing.md, paddingBottom: spacing.xxl},
    typeSegment: {marginBottom: spacing.sm},
    categoryScroll: {marginBottom: spacing.md},
    categoryChip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        marginRight: spacing.sm,
        overflow: 'hidden',
    },
    list: {gap: spacing.sm},
    card: {gap: spacing.xs},
    cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm},
    flex1: {flex: 1, minWidth: 0},
    badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
});

export default NearbyJobPostingsScreen;
