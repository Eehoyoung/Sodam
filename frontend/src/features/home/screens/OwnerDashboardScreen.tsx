import React, {useCallback, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {useNavigation, useFocusEffect, useRoute, type RouteProp} from '@react-navigation/native';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    CtaStack,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/format/money';
import StoreSwitcherSheet from '../../../common/components/store/StoreSwitcherSheet';
import {StoreSetupCard} from '../../store/components/StoreSetupCard';
import storeService from '../../store/services/storeService';
import {fetchDashboardStats, fetchTodayStats, MonthPayrollStats, TodayStats} from '../../store/services/insightsService';
import {fetchLaborRisks, LaborRiskItem} from '../../risk/services/riskService';
import {useSubscription} from '../../subscription/hooks/useSubscription';
import {PastDueBanner} from '../../subscription/components/PastDueBanner';
import {useManagedStores} from '../../manager/hooks/useManagedStores';
import type {ManagedStore, ManagerPermission} from '../../manager/types';
import {AttendanceCreditPopupHost} from '../../recruitment/components/AttendanceCreditPopupHost';
import {logger} from '../../../utils/logger';

type MonthPayroll = MonthPayrollStats;

export interface SimpleStore {
    id: number;
    storeName: string;
}

/** 개발용 시각 검증 전용 — 08 OwnerHome(OwnerDashboardContent)의 실 API 조회를 고정 데이터로 대체한다. */
export interface OwnerDashboardVisualFixture {
    stores: SimpleStore[];
    selectedStoreId: number | null;
    today: TodayStats | null;
    monthly: MonthPayrollStats | null;
}

interface OwnerDashboardContentProps {
    visualFixture?: OwnerDashboardVisualFixture;
}

/**
 * 08 OwnerHome — v3 "링 & 패스" 시안 구조.
 * spot-card "오늘 처리할 일" → stat-grid(출근/예상급여/남은일) → 오늘 출근 현황.
 * "빠르게 하기"·"인사이트"는 10 OwnerDashboardDetail(별도 라우트)로 분리했다
 * (docs/260720/owner-dashboard-code-vs-artifact.html 실사 결과 반영).
 */
export const OwnerDashboardContent: React.FC<OwnerDashboardContentProps> = ({visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    // 결제 실패(PAST_DUE) 침묵 이탈 방지 — 카드 재등록 유도 배너 노출용 (T1-6)
    const {current: subscription} = useSubscription();
    const isPastDue = subscription?.status === 'PAST_DUE';
    const goReRegisterCard = useCallback(() => navigation.navigate('Subscribe'), [navigation]);
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState<SimpleStore[]>(visualFixture?.stores ?? []);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(visualFixture?.selectedStoreId ?? null);
    const [today, setToday] = useState<TodayStats | null>(visualFixture?.today ?? null);
    const [monthly, setMonthly] = useState<MonthPayroll | null>(visualFixture?.monthly ?? null);
    const [loaded, setLoaded] = useState(!!visualFixture);
    const [error, setError] = useState(false);
    const [setupRefreshKey, setSetupRefreshKey] = useState(0);
    // 260815 WP-3/WP-7 — 노무 확인 필요 건수(참고 산정). 조회 실패는 카드 자체를 숨겨 대시보드
    // 본체를 막지 않는다(best-effort, HC-5: 경고 표시가 화면 자체를 깨면 안 된다).
    const [laborRiskItems, setLaborRiskItems] = useState<LaborRiskItem[] | null>(visualFixture ? [] : null);

    const load = useCallback(async () => {
        try {
            setError(false);
            const masterStores = await storeService.getMasterStores('current');
            const storeList: SimpleStore[] = masterStores.map(s => ({
                id: s.id,
                storeName: s.storeName,
            }));
            setStores(storeList);
            setLoaded(true);
            const activeId = selectedStoreId ?? storeList[0]?.id ?? null;
            // eslint-disable-next-line eqeqeq -- intentional == null: matches both null and undefined
            if (selectedStoreId == null) {
                setSelectedStoreId(activeId);
            }
            const firstStore = storeList.find(s => s.id === activeId);
            if (!firstStore?.id) {
                setToday(null);
                return;
            }
            // 순차 2콜(today → month-to-date) 대신 합성 엔드포인트 1콜(Phase 9, DB_OPTIMIZATION_PLAN.md).
            const dashboard = await fetchDashboardStats(firstStore.id).catch(() => null);

            setToday(
                dashboard?.today ?? {
                    storeId: firstStore.id,
                    storeName: firstStore.storeName ?? '내 매장',
                    checkedInCount: 0,
                    totalActiveEmployees: 0,
                    pendingEmployees: [],
                    pendingCorrectionCount: 0,
                },
            );
            setMonthly(
                dashboard?.payroll ?? {
                    totalGross: 0,
                    totalNet: 0,
                    totalWorkingHours: 0,
                    daysRemainingInMonth: daysLeftInMonth(),
                },
            );
            try {
                setLaborRiskItems(await fetchLaborRisks(firstStore.id));
            } catch (riskError) {
                // 카드 하나 실패로 대시보드 전체를 막지 않는다 — 조용히 숨김(카드 미노출).
                logger.debug('[OwnerDashboard] labor risk load failed', riskError);
                setLaborRiskItems(null);
            }
        } catch (e) {
            // 핵심 매장 조회 실패 — 조용히 삼키지 않고 에러/재시도 UI 로 노출
            logger.warn('[OwnerDashboard] load failed', e);
            setError(true);
            setLoaded(true);
        }
    }, [selectedStoreId]);

    // 포커스마다 재조회 — 출퇴근/직원 입사/매장 변경이 대시보드(출근 인원·직원 수·매장)에 즉시 반영.
    useFocusEffect(
        useCallback(() => {
            if (visualFixture) {
                return;
            }
            load();
        }, [load, visualFixture]),
    );

    // 실시간 동기화 — 선택 매장의 출퇴근/직원 변경 시(보고 있는 동안) 대시보드 즉시 갱신.
    useStoreLiveSync(visualFixture ? [] : selectedStoreId ? [selectedStoreId] : [], () => {
        if (!visualFixture) {
            load();
        }
    });

    const onRefresh = async () => {
        if (visualFixture) {
            return;
        }
        setRefreshing(true);
        await load();
        setSetupRefreshKey(k => k + 1);
        setRefreshing(false);
    };

    const pending = today?.pendingEmployees ?? [];
    const checkedInCount = today?.checkedInCount ?? 0;
    const totalActiveEmployees = today?.totalActiveEmployees ?? 0;
    const todoCount = pending.length;

    // 핵심 데이터 로드 실패 — 에러/재시도 노출 (조용한 실패 금지)
    if (error) {
        return (
            <ScreenContainer header={<AppHeader title="소담" />}>
                <ErrorState
                    title="대시보드를 불러오지 못했어요"
                    description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    // A6 콜드스타트 — 매장 0개 사장 첫 진입
    if (loaded && stores.length === 0) {
        return (
            <ScreenContainer header={<AppHeader title="소담" />}>
                <EmptyState
                    glyph={<Ionicons name="storefront-outline" size={26} color={c.textInverse} />}
                    title="첫 매장을 등록해 볼까요?"
                    description="매장을 등록하면 직원 초대와 출퇴근, 급여 정산을 바로 시작할 수 있어요."
                    primary={{label: '매장 등록하기', onPress: () => navigation.navigate('StoreRegistration')}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            padded={false}
            header={
                <AppHeader
                    title={today?.storeName ?? '카페 소담'}
                    actions={[
                        {
                            label: '상세',
                            icon: <Ionicons name="stats-chart-outline" size={20} color={c.brandPrimary} />,
                            accessibilityLabel: '운영 대시보드 상세',
                            onPress: () => {
                                if (selectedStoreId !== null) {
                                    navigation.navigate('OwnerDashboardDetail', {storeId: selectedStoreId});
                                }
                            },
                        },
                        {
                            label: '알림',
                            icon: <Ionicons name="notifications-outline" size={20} color={c.brandPrimary} />,
                            accessibilityLabel: '알림',
                            onPress: () => navigation.navigate('NotificationCenter'),
                        },
                    ]}
                />
            }
            footer={
                <CtaStack>
                    <AppButton label="급여 정산하기" onPress={() => navigation.navigate('SalaryList')} />
                </CtaStack>
            }>
            {/* 사장 출석체크 팝업 — 오늘 미출석이면 1일 1회 자동 노출(§5). 매니저 모드에서는
                마운트하지 않는다(AttendanceCreditController는 @MasterOnly 전용 API). */}
            {visualFixture ? null : <AttendanceCreditPopupHost />}
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}>
                {isPastDue ? <PastDueBanner onPress={goReRegisterCard} /> : null}

                {/* 52 매장 전환 시트 — 사장 소유 매장 다건일 때만 노출(§3.2: 직원 소속매장 패스칩과는 다른 개념) */}
                <StoreSwitcherSheet
                    stores={stores}
                    selectedId={selectedStoreId}
                    onSelect={setSelectedStoreId}
                    onRegisterNew={() => navigation.navigate('StoreRegistration')}
                />

                {/* 매장 설정 완성도 + 다음 한 가지 (GR-NEW-06) — 유령매장 절벽 완화 */}
                {selectedStoreId !== null ? (
                    <StoreSetupCard
                        storeId={selectedStoreId}
                        refreshKey={setupRefreshKey}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 동적 routeName(string) 디스패치: StoreSetupCard 가 런타임에 라우트명을 결정
                        onNavigate={(routeName, params) => navigation.navigate(routeName as any, params as any)}
                    />
                ) : null}

                {/* 오늘 처리할 일 — v3 스팟 카드(흰 배경 + 코랄 테두리, D-2), 시안상 진입 직후 1번째 블록 */}
                <AppCard variant="spot" hero style={styles.taskCard}>
                    <View style={styles.taskTop}>
                        <Ionicons
                            name={todoCount > 0 ? 'alert-circle' : 'checkmark-circle'}
                            size={22}
                            color={todoCount > 0 ? c.brandPrimary : c.success}
                        />
                        <AppText variant="headingSm" tone="primary" style={styles.taskTitle}>
                            {todoCount > 0 ? `오늘 처리할 일 ${todoCount}건` : '오늘 처리할 일이 없어요'}
                        </AppText>
                    </View>
                    <AppText variant="bodyMd" tone="secondary" style={styles.taskSub}>
                        출근 {checkedInCount}/{totalActiveEmployees}명 · 총 근무 {(monthly?.totalWorkingHours ?? 0).toFixed(1)}h
                    </AppText>
                    <AppButton
                        label="이상 출퇴근 확인"
                        variant="secondary"
                        onPress={() => navigation.navigate('MissingAttendanceCenter')}
                        style={styles.taskCta}
                    />
                </AppCard>

                {/* 260815 WP-3/WP-7 — 노무 확인 필요 건수(참고 산정, HC-1: 등급·안전 표현 금지). */}
                {laborRiskItems !== null && selectedStoreId !== null ? (
                    <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => navigation.navigate('LaborRisk', {storeId: selectedStoreId})}>
                        <AppCard variant="flat" style={styles.laborRiskCard}>
                            <View style={styles.taskTop}>
                                <Ionicons
                                    name={laborRiskItems.length > 0 ? 'shield-half-outline' : 'checkmark-circle-outline'}
                                    size={22}
                                    color={laborRiskItems.length > 0 ? c.warning : c.success}
                                />
                                <AppText variant="headingSm" tone="primary" style={styles.taskTitle}>
                                    {laborRiskItems.length > 0
                                        ? `노무 확인 필요 ${laborRiskItems.length}건`
                                        : '지금 확인이 필요한 노무 항목이 없어요'}
                                </AppText>
                            </View>
                            <AppText variant="caption" tone="secondary" style={styles.taskSub}>
                                확정된 근무·계약 정보 기준 참고 점검이에요. 최종 판단은 근로감독관·법원의 권한이에요.
                            </AppText>
                        </AppCard>
                    </TouchableOpacity>
                ) : null}

                {/* stat-grid — 출근/예상급여/남은일 3분할 (시안 08) */}
                <View style={styles.statGrid}>
                    <StatTile label="출근" value={`${checkedInCount}/${totalActiveEmployees}`} tone={c.success} />
                    <StatTile label="예상급여" value={formatMoney(monthly?.totalGross ?? 0)} tone={c.brandPrimary} />
                    <StatTile label="남은일" value={`${monthly?.daysRemainingInMonth ?? 0}일`} tone={c.textPrimary} />
                </View>

                {/* 오늘 출근 현황 — 미출근 + 정상 출근 요약을 한 리스트로 통합 */}
                <View style={styles.section}>
                    <AppText variant="headingSm">오늘 출근 현황</AppText>
                    {pending.length > 0 ? (
                        <View style={styles.list}>
                            {pending.map(name => (
                                <AppListItem
                                    key={name}
                                    title={name}
                                    subtitle="아직 출근 기록 없음"
                                    left={<Ionicons name="person-circle-outline" size={26} color={c.warning} />}
                                    right={<AppBadge label="알림" tone="warning" />}
                                />
                            ))}
                            {/* ⚠️ 갭: 근무중 직원 개별 경과시간(누가 몇 시부터 근무중인지)은 BE 응답(TodayStats)에
                                없어 시안처럼 이름별 행으로는 표시하지 못한다 — 집계 수치만 정직하게 보여준다. */}
                            {checkedInCount > 0 ? (
                                <AppListItem
                                    title={`정상 출근 ${checkedInCount}명`}
                                    subtitle="근무중 · 매장 반경 내"
                                    left={<Ionicons name="checkmark-circle-outline" size={26} color={c.success} />}
                                    right={<AppBadge label="정상" tone="success" />}
                                />
                            ) : null}
                        </View>
                    ) : (
                        <AppCard variant="plain">
                            <View style={styles.allInRow}>
                                <Ionicons name="checkmark-circle" size={22} color={c.success} />
                                <AppText variant="bodyLg" tone="success" style={styles.allInText}>
                                    모든 직원이 출근했어요 ✅
                                </AppText>
                            </View>
                        </AppCard>
                    )}
                </View>
            </ScrollView>
        </ScreenContainer>
    );
};

const StatTile: React.FC<{label: string; value: string; tone: string}> = ({label, value, tone}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.statTile, {borderColor: c.border, backgroundColor: c.background}]}>
            <AppText variant="caption" tone="secondary" style={styles.statLabel}>{label}</AppText>
            <AppText variant="titleMd" weight="800" style={{color: tone}}>{value}</AppText>
        </View>
    );
};

/** 개발용 시각 검증 전용 — 46 ManagerHome(ManagerDashboardContent)의 실 위임 조회/오늘 통계 조회를 고정 데이터로 대체한다. */
export interface ManagerDashboardVisualFixture {
    delegation: ManagedStore;
    today: TodayStats;
}

interface ManagerDashboardContentProps {
    storeId: number;
    visualFixture?: ManagerDashboardVisualFixture;
}

export const ManagerDashboardContent: React.FC<ManagerDashboardContentProps> = ({storeId, visualFixture}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const managedStores = useManagedStores();
    const delegation = visualFixture
        ? visualFixture.delegation
        : managedStores.data?.find(store => store.storeId === storeId && store.active);
    const [today, setToday] = useState<TodayStats | null>(visualFixture?.today ?? null);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        if (visualFixture) {
            return;
        }
        try {
            setError(false);
            const data = await fetchTodayStats(storeId);
            setToday(data);
        } catch (e) {
            logger.warn('[ManagerDashboard] load failed', e);
            setError(true);
        }
    }, [storeId, visualFixture]);

    useFocusEffect(useCallback(() => {
        if (visualFixture) {
            return;
        }
        managedStores.refetch();
        load();
        // The query observer object changes as data arrives; refetch itself is the stable dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, managedStores.refetch, visualFixture]));
    useStoreLiveSync(visualFixture ? [] : [storeId], () => {
        if (!visualFixture) {
            load();
        }
    });

    const has = (permission: ManagerPermission) => delegation?.permissions.includes(permission) === true;
    if (error) {
        return <ScreenContainer header={<AppHeader title="매장 운영" onBack={() => navigation.goBack()} />}>
            <ErrorState title="운영 현황을 불러오지 못했어요" description="위임 상태와 네트워크를 확인해 주세요."
                primary={{label: '다시 시도', onPress: load}} />
        </ScreenContainer>;
    }
    if ((!visualFixture && managedStores.isLoading) || !today) {
        return <ScreenContainer header={<AppHeader title="매장 운영" onBack={() => navigation.goBack()} />}>
            <LoadingState title="매장 운영 현황 확인 중" description="위임 권한과 오늘 출근 현황을 불러오고 있어요." />
        </ScreenContainer>;
    }
    if (!delegation) {
        return <ScreenContainer header={<AppHeader title="매장 운영" onBack={() => navigation.goBack()} />}>
            <ErrorState title="활성 위임을 확인할 수 없어요" description="서명 완료 또는 위임 해제 여부를 확인해 주세요."
                primary={{label: '위임 현황 보기', onPress: () => navigation.navigate('ManagerMyPageScreen')}} />
        </ScreenContainer>;
    }

    const pending = today.pendingEmployees ?? [];
    return (
        <ScreenContainer padded={false} header={<AppHeader title={today.storeName || delegation.storeName}
            onBack={() => navigation.goBack()} />}>
            <ScrollView contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
                    if (visualFixture) {
                        return;
                    }
                    setRefreshing(true);
                    await Promise.all([load(), managedStores.refetch()]);
                    setRefreshing(false);
                }} />}>
                <AppCard variant="spot" hero style={styles.taskCard}>
                    <AppText variant="caption" tone="secondary">매니저 운영 모드</AppText>
                    <AppText variant="headingSm" tone="primary">
                        오늘 출근 {today.checkedInCount}/{today.totalActiveEmployees}명
                    </AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.taskSub}>
                        급여·구독·직원 추가·매장 설정 정보는 이 화면에서 조회하지 않습니다.
                    </AppText>
                </AppCard>

                <View style={styles.section}>
                    <AppText variant="headingSm">오늘 출근 현황</AppText>
                    {pending.length > 0 ? pending.map(name => (
                        <AppListItem key={name} title={name} subtitle="아직 출근 기록 없음"
                            left={<Ionicons name="person-circle-outline" size={26} color={c.warning} />}
                            right={<AppBadge label="확인" tone="warning" />} />
                    )) : <AppCard variant="plain"><AppText variant="bodyLg" tone="success">모든 직원이 출근했어요.</AppText></AppCard>}
                    {has('ATTENDANCE_APPROVE') ? (
                        <AppListItem
                            title="정정 요청"
                            subtitle={today.pendingCorrectionCount > 0
                                ? `대기 ${today.pendingCorrectionCount}건`
                                : '대기 중인 요청 없음'}
                            left={<Ionicons name="create-outline" size={26}
                                color={today.pendingCorrectionCount > 0 ? c.brandPrimary : c.success} />}
                            right={<AppBadge
                                label={today.pendingCorrectionCount > 0 ? '요청' : '완료'}
                                tone={today.pendingCorrectionCount > 0 ? 'error' : 'success'} />}
                        />
                    ) : null}
                </View>

                <View style={styles.section}>
                    <AppText variant="headingSm">위임받은 업무</AppText>
                    {has('ATTENDANCE_APPROVE') ? <AppListItem title="출퇴근 승인" right="›"
                        onPress={() => navigation.navigate('AttendanceApproval', {storeId})} /> : null}
                    {has('TIMEOFF_APPROVE') ? <AppListItem title="휴가 승인" right="›"
                        onPress={() => navigation.navigate('TimeOffApproval', {storeId})} /> : null}
                    {has('SCHEDULE_MANAGE') ? <AppListItem title="스케줄 관리" right="›"
                        onPress={() => navigation.navigate('StoreSchedule', {storeId})} /> : null}
                    {has('STAFF_VIEW') ? <AppListItem title="직원 조회" subtitle="연락처는 마스킹되어 표시됩니다." right="›"
                        onPress={() => navigation.navigate('EmployeeManagement', {storeId, managerMode: true})} /> : null}
                    {has('SUBSTITUTE_MANAGE') ? <AppListItem title="공지·대타 관리" right="›"
                        onPress={() => navigation.navigate('StoreNoticeList', {storeId})} /> : null}
                </View>
            </ScrollView>
        </ScreenContainer>
    );
};

const OwnerDashboardScreen: React.FC = () => {
    const route = useRoute<RouteProp<HomeStackParamList, 'OwnerDashboard'>>();
    return route.params?.managerMode
        ? <ManagerDashboardContent storeId={route.params.storeId} />
        : <OwnerDashboardContent />;
};

function daysLeftInMonth(): number {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, last - now.getDate());
}

const styles = StyleSheet.create({
    content: {paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xxl},
    taskCard: {gap: spacing.xs},
    laborRiskCard: {gap: spacing.xs},
    taskTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    taskTitle: {flexShrink: 1},
    taskSub: {marginTop: spacing.xs, opacity: 0.85},
    taskCta: {marginTop: spacing.lg},
    statGrid: {flexDirection: 'row', gap: spacing.sm},
    statTile: {flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4},
    statLabel: {marginBottom: 2},
    section: {gap: spacing.md},
    list: {gap: spacing.sm},
    allInRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    allInText: {flexShrink: 1},
});

export default OwnerDashboardScreen;
