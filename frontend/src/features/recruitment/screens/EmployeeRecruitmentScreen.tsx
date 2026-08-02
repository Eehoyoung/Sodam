/* eslint-disable react-native/no-color-literals -- 히어로 그라디언트 위 반투명 흰색 칩(AttendanceCreditSummaryCard와 동일 패턴) */
/**
 * EmployeeRecruitmentScreen — [직원] 채용 허브 (260711_작업통합.md Part 2 §19.4).
 *
 * `EmployeeAttendanceHome` 빠른 메뉴 '채용·구직' 타일의 유일 진입점. 상단 세그먼트 3개:
 *   구직 설정(§7.3 전체 구현) / 주변 구인(Phase 6 자리만) / 채용함(Phase 6 자리만)
 *
 * `HomeStackParamList.EmployeeRecruitment: {tab?: 'profile'|'nearby'|'inbox'}` 파라미터로
 * 초기 탭을 지정할 수 있다(§19.4). `JobSeekingSettings` 단독 라우트는 이 화면으로 흡수됐다.
 *
 * 채팅(§4, Phase D) 진입점: 세그먼트 탭이 아니라 헤더 액션 아이콘으로 둔다 — `ChatRoomListScreen`
 * 은 [사장]`JobSeekerListScreen`에서도 동일하게 독립 push 라우트로 재사용되고 자체
 * `ScreenContainer`/`AppHeader`(뒤로가기)를 갖고 있어, 다른 탭들처럼 본문만 조건부 렌더하는
 * 방식으로 넣으면 헤더가 이중으로 표시된다.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {AppHeader, AppText, GradientHeroCard, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import JobSeekingSettingsScreen from './JobSeekingSettingsScreen';
import NearbyJobPostingsScreen from './NearbyJobPostingsScreen';
import JobOfferInboxScreen from './JobOfferInboxScreen';
import type {JobPostingNearbyItem, JobOffer, JobSeekingProfile} from '../types';
import {useMyJobOffers, useMyJobSeeking} from '../hooks/useRecruitmentQueries';

type RecruitmentTabKey = 'profile' | 'nearby' | 'inbox';

const TAB_KEYS: RecruitmentTabKey[] = ['profile', 'nearby', 'inbox'];
const TAB_LABELS: string[] = ['구직 설정', '주변 구인', '채용함'];

interface Props {
    /** 개발용 시각 검증 전용 — route.params 없이도 초기 탭을 지정한다. */
    visualInitialTab?: RecruitmentTabKey;
    /** 개발용 시각 검증 전용 — 'nearby' 탭의 실 API를 고정 목록으로 대체한다. */
    visualNearbyFixture?: JobPostingNearbyItem[];
    /** 개발용 시각 검증 전용 — 상단 히어로의 구직 상태/제안 수를 고정 데이터로 대체한다. */
    visualHeroFixture?: {profile: JobSeekingProfile; offers: JobOffer[]};
}

const EmployeeRecruitmentScreen: React.FC<Props> = ({visualInitialTab, visualNearbyFixture, visualHeroFixture}) => {
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'EmployeeRecruitment'>>();
    const initialIndex = Math.max(0, TAB_KEYS.indexOf(visualInitialTab ?? route.params?.tab ?? 'profile'));
    const [tabIndex, setTabIndex] = useState(initialIndex);

    // 히어로 전용 조회 — `JobSeekingSettingsScreen`/`JobOfferInboxScreen`과 동일 쿼리키를 쓰므로
    // TanStack Query 캐시가 요청을 중복 발생시키지 않는다(같은 쿼리키는 하나의 in-flight 요청 공유).
    const seekingQuery = useMyJobSeeking();
    const offersQuery = useMyJobOffers(!visualHeroFixture);
    const profile = visualHeroFixture?.profile ?? seekingQuery.data;
    const offers = visualHeroFixture?.offers ?? offersQuery.data ?? [];
    const pendingOfferCount = offers.filter(o => o.status === 'PENDING').length;

    return (
        <ScreenContainer
            scroll
            header={
                <AppHeader
                    title="채용·구직"
                    onBack={() => navigation.goBack()}
                    actions={[
                        {
                            icon: <Ionicons name="chatbubble-ellipses-outline" size={18} color={c.textPrimary} />,
                            accessibilityLabel: '채팅',
                            onPress: () => navigation.navigate('ChatRoomList'),
                        },
                    ]}
                />
            }>
            {profile ? (
                <GradientHeroCard style={styles.hero} testID="employee-recruitment-hero">
                    <AppText variant="caption" tone="inverse" style={styles.heroLabel}>나의 구직 상태</AppText>
                    <AppText variant="headingSm" tone="inverse" weight="800">
                        {profile.seeking ? '구직중 · ON' : '구직중 아님 · OFF'}
                    </AppText>
                    {pendingOfferCount > 0 ? (
                        <View style={styles.heroChip} testID="employee-recruitment-hero-offer-chip">
                            <AppText variant="caption" tone="inverse" weight="700">
                                {`대기중인 제안 ${pendingOfferCount}건`}
                            </AppText>
                        </View>
                    ) : null}
                </GradientHeroCard>
            ) : null}

            <SegmentedControl options={TAB_LABELS} value={tabIndex} onChange={setTabIndex} style={styles.segment} />

            {/*
             * 탭 전환은 조건부 렌더로 마운트/언마운트한다 — 다시 선택될 때마다 새로 마운트되므로
             * 각 탭 컴포넌트의 TanStack Query 훅이 기본 `refetchOnMount` 로 매번 재조회한다(§10
             * Phase6 "세그먼트 전환마다 refetch"). 수동 `useFocusEffect(refetch)` 조합은 마운트
             * 자동조회와 중복 호출되는 문제(FE-DUP, findings_report.md §4.1)가 있어 제거했다 —
             * 각 탭 화면(JobSeekingSettingsScreen 등)의 훅 staleTime 설정만으로 충분하다.
             */}
            {tabIndex === 0 ? <JobSeekingSettingsScreen /> : null}
            {tabIndex === 1 ? (
                <NearbyJobPostingsScreen onGoToProfileTab={() => setTabIndex(0)} visualFixture={visualNearbyFixture} />
            ) : null}
            {tabIndex === 2 ? <JobOfferInboxScreen /> : null}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    hero: {marginBottom: spacing.lg, gap: 4},
    heroLabel: {opacity: 0.85},
    heroChip: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 999,
        paddingHorizontal: spacing.md,
        paddingVertical: 5,
        marginTop: spacing.sm,
    },
    segment: {marginBottom: spacing.lg},
});

export default EmployeeRecruitmentScreen;
