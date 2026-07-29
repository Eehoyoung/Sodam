/**
 * EmployeeRecruitmentScreen — [직원] 채용 허브 (260711_작업통합.md Part 2 §19.4).
 *
 * `EmployeeAttendanceHome` 빠른 메뉴 '채용·구직' 타일의 유일 진입점. 상단 세그먼트 3개:
 *   구직 설정(§7.3 전체 구현) / 주변 구인(Phase 6 자리만) / 채용함(Phase 6 자리만)
 *
 * `HomeStackParamList.EmployeeRecruitment: {tab?: 'profile'|'nearby'|'inbox'}` 파라미터로
 * 초기 탭을 지정할 수 있다(§19.4). `JobSeekingSettings` 단독 라우트는 이 화면으로 흡수됐다.
 */
import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AppHeader, ScreenContainer, SegmentedControl} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {spacing} from '../../../theme/tokens';
import JobSeekingSettingsScreen from './JobSeekingSettingsScreen';
import NearbyJobPostingsScreen from './NearbyJobPostingsScreen';
import JobOfferInboxScreen from './JobOfferInboxScreen';
import type {JobPostingNearbyItem} from '../types';

type RecruitmentTabKey = 'profile' | 'nearby' | 'inbox';

const TAB_KEYS: RecruitmentTabKey[] = ['profile', 'nearby', 'inbox'];
const TAB_LABELS: string[] = ['구직 설정', '주변 구인', '채용함'];

interface Props {
    /** 개발용 시각 검증 전용 — route.params 없이도 초기 탭을 지정한다. */
    visualInitialTab?: RecruitmentTabKey;
    /** 개발용 시각 검증 전용 — 'nearby' 탭의 실 API를 고정 목록으로 대체한다. */
    visualNearbyFixture?: JobPostingNearbyItem[];
}

const EmployeeRecruitmentScreen: React.FC<Props> = ({visualInitialTab, visualNearbyFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'EmployeeRecruitment'>>();
    const initialIndex = Math.max(0, TAB_KEYS.indexOf(visualInitialTab ?? route.params?.tab ?? 'profile'));
    const [tabIndex, setTabIndex] = useState(initialIndex);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="채용·구직" onBack={() => navigation.goBack()} />}>
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
    segment: {marginBottom: spacing.lg},
});

export default EmployeeRecruitmentScreen;
