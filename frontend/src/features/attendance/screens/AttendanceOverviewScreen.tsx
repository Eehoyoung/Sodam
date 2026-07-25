import React, {useCallback, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    ErrorState,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {AttendanceFilterSheet} from '../components/AttendanceSheets';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {fetchDashboardStats} from '../../store/services/insightsService';
import attendanceService from '../services/attendanceService';
import {AttendanceStatistics} from '../types';

const RANGES = ['오늘', '이번 주', '이번 달'];

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/**
 * 19 AttendanceOverview — 신규 화면(v3 §4.1).
 * "오늘"은 store-queries dashboard 응답(pendingEmployees/checkedInCount)을 그대로 쓴다.
 * "이번 주"/"이번 달"은 개인별 목록 API 가 없어(§ OwnerHome 과 동일 갭), 매장 단위 집계
 * (GET /api/attendance/statistics/store/{storeId})로 대체 표기한다 — 이름별 행은 만들지 않는다.
 */
const AttendanceOverviewScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<RouteProp<HomeStackParamList, 'AttendanceOverview'>>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [range, setRange] = useState(0);
    const [pendingEmployees, setPendingEmployees] = useState<string[]>([]);
    const [checkedInCount, setCheckedInCount] = useState(0);
    const [totalActiveEmployees, setTotalActiveEmployees] = useState(0);
    const [pendingCorrectionCount, setPendingCorrectionCount] = useState(0);
    const [rangeStats, setRangeStats] = useState<AttendanceStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    // 58 AttendanceFilterSheet 배선 — 상단 인라인 SegmentedControl 과 병행 배치(교체 아님).
    // 헤더의 필터 아이콘으로도 같은 range 를 고를 수 있게 한다.
    const [filterSheetVisible, setFilterSheetVisible] = useState(false);

    const load = useCallback(async (rangeIdx: number) => {
        try {
            setError(false);
            const today = await fetchDashboardStats(storeId);
            setPendingEmployees(today.today.pendingEmployees ?? []);
            setCheckedInCount(today.today.checkedInCount ?? 0);
            setTotalActiveEmployees(today.today.totalActiveEmployees ?? 0);
            setPendingCorrectionCount(today.today.pendingCorrectionCount ?? 0);

            if (rangeIdx > 0) {
                const now = new Date();
                const start = new Date(now);
                if (rangeIdx === 1) {
                    start.setDate(now.getDate() - now.getDay());
                } else {
                    start.setDate(1);
                }
                const stats = await attendanceService.getWorkplaceAttendanceStatistics(
                    String(storeId), isoDate(start), isoDate(now),
                );
                setRangeStats(stats);
            } else {
                setRangeStats(null);
            }
        } catch (e) {
            console.warn('[AttendanceOverview] load failed', e);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        load(range);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]));

    const header = (
        <AppHeader
            title="근태 관리"
            onBack={() => navigation.goBack()}
            actions={[{
                icon: <Ionicons name="options-outline" size={20} color={c.textSecondary} />,
                accessibilityLabel: '근태 필터',
                onPress: () => setFilterSheetVisible(true),
            }]}
        />
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="근태 현황을 불러오는 중" description="잠시만 기다려 주세요." />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="근태 현황을 불러오지 못했어요" description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: () => load(range)}} />
            </ScreenContainer>
        );
    }

    const missingCount = pendingCorrectionCount;

    return (
        <ScreenContainer padded={false} header={header}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
                    setRefreshing(true);
                    load(range);
                }} />}
                showsVerticalScrollIndicator={false}>
                <AppCard variant="spot" hero style={styles.spotCard}>
                    <AppText variant="headingSm" tone="primary">누락 기록 {missingCount}건</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.spotSub}>
                        오늘 출근 {checkedInCount}/{totalActiveEmployees}명 · 정산 전 확인이 필요해요.
                    </AppText>
                </AppCard>

                <SegmentedControl
                    options={RANGES}
                    value={range}
                    onChange={i => {
                        setRange(i);
                        load(i);
                    }}
                    style={styles.segment}
                />

                {range === 0 ? (
                    <View style={styles.list}>
                        {pendingEmployees.map(name => (
                            <AppListItem
                                key={name}
                                title={name}
                                subtitle="미출근"
                                left={<Ionicons name="person-circle-outline" size={26} color={c.warning} />}
                                right={<AppBadge label="확인" tone="warning" />}
                            />
                        ))}
                        {/* ⚠️ 갭: 개인별 "정상 출근"·"퇴근 누락" 행은 BE 응답에 근거 데이터가 없어
                            이름별로 만들지 않는다(OwnerHome 과 동일 사유) — 집계만 정직하게 보여준다. */}
                        {checkedInCount > 0 ? (
                            <AppListItem
                                title={`정상 출근 ${checkedInCount}명`}
                                subtitle="매장 반경 내"
                                left={<Ionicons name="checkmark-circle-outline" size={26} color={c.success} />}
                                right={<AppBadge label="정상" tone="success" />}
                            />
                        ) : null}
                        {pendingEmployees.length === 0 && checkedInCount === 0 ? (
                            <AppText variant="bodyMd" tone="secondary" center style={styles.emptyText}>
                                오늘 출근 예정 인원이 없어요.
                            </AppText>
                        ) : null}
                    </View>
                ) : (
                    <AppCard variant="outlined">
                        <AppText variant="titleMd" weight="700">{RANGES[range]} 근태 집계</AppText>
                        {rangeStats ? (
                            <View style={styles.statsGrid}>
                                <StatRow label="총 근무일" value={`${rangeStats.totalWorkDays}일`} />
                                <StatRow label="총 근무시간" value={`${rangeStats.totalWorkHours.toFixed(1)}h`} />
                                <StatRow label="지각" value={`${rangeStats.lateCount}건`} />
                                <StatRow label="결근" value={`${rangeStats.absentCount}건`} />
                            </View>
                        ) : (
                            <AppText variant="bodyMd" tone="secondary" style={styles.emptyText}>집계를 불러오지 못했어요.</AppText>
                        )}
                    </AppCard>
                )}
            </ScrollView>

            <AttendanceFilterSheet
                visible={filterSheetVisible}
                onClose={() => setFilterSheetVisible(false)}
                onApply={rangeIdx => {
                    setFilterSheetVisible(false);
                    setRange(rangeIdx);
                    load(rangeIdx);
                }}
            />
        </ScreenContainer>
    );
};

const StatRow: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.statRow}>
        <AppText variant="bodyMd" tone="secondary">{label}</AppText>
        <AppText variant="titleMd" weight="700">{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg},
    spotCard: {gap: spacing.xs},
    spotSub: {marginTop: 2},
    segment: {marginTop: 0},
    list: {gap: spacing.sm},
    emptyText: {paddingVertical: spacing.lg},
    statsGrid: {marginTop: spacing.md, gap: spacing.sm},
    statRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
});

export default AttendanceOverviewScreen;
