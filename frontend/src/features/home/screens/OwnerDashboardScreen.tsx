import React, {useCallback, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation, useFocusEffect, useRoute, type RouteProp} from '@react-navigation/native';
import {useStoreLiveSync} from '../../../common/hooks/useStoreLiveSync';
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
    AmountText,
    CtaStack,
    EmptyState,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {recruit, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/utils/format';
import StoreSelector, {SelectableStore} from '../../../common/components/store/StoreSelector';
import {StoreSetupCard} from '../../store/components/StoreSetupCard';
import {useAuth} from '../../../contexts/AuthContext';
import api from '../../../common/utils/api';
import {useSubscription} from '../../subscription/hooks/useSubscription';
import {PastDueBanner} from '../../subscription/components/PastDueBanner';
import {useManagedStores} from '../../manager/hooks/useManagedStores';
import type {ManagerPermission} from '../../manager/types';

interface TodayStats {
    storeId: number;
    storeName: string;
    checkedInCount: number;
    totalActiveEmployees: number;
    pendingEmployees: string[];
}

interface MonthPayroll {
    totalGross: number;
    totalNet: number;
    totalWorkingHours: number;
    daysRemainingInMonth: number;
}

/**
 * OwnerHome / Dashboard — v3 토스식 재디자인.
 * 숫자 히어로(이번 달 예상 인건비) 상단 + 출근 현황 + 빠른 액션 리스트(Ionicons).
 * 1차 행동(급여 정산)은 하단 풀폭 CTA. load/StoreSelector/네비게이션 보존.
 */
const OwnerDashboardContent: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const {user} = useAuth();
    const c = useThemeColors();
    // 결제 실패(PAST_DUE) 침묵 이탈 방지 — 카드 재등록 유도 배너 노출용 (T1-6)
    const {current: subscription} = useSubscription();
    const isPastDue = subscription?.status === 'PAST_DUE';
    const goReRegisterCard = useCallback(() => navigation.navigate('Subscribe'), [navigation]);
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState<SelectableStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [today, setToday] = useState<TodayStats | null>(null);
    const [monthly, setMonthly] = useState<MonthPayroll | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [setupRefreshKey, setSetupRefreshKey] = useState(0);

    const load = useCallback(async () => {
        try {
            setError(false);
            const storesRes = await api.get<any[]>(`/api/stores/master/current`);
            const storeList: SelectableStore[] = ((storesRes.data) ?? []).map(s => ({
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
            const dashboardRes = await api
                .get<{today: TodayStats; payroll: MonthPayroll}>(`/api/store-queries/${firstStore.id}/stats/dashboard`)
                .catch(() => null);

            setToday(
                dashboardRes?.data.today ?? {
                    storeId: firstStore.id,
                    storeName: firstStore.storeName ?? '내 매장',
                    checkedInCount: 0,
                    totalActiveEmployees: 0,
                    pendingEmployees: [],
                },
            );
            setMonthly(
                dashboardRes?.data.payroll ?? {
                    totalGross: 0,
                    totalNet: 0,
                    totalWorkingHours: 0,
                    daysRemainingInMonth: daysLeftInMonth(),
                },
            );
        } catch (e) {
            // 핵심 매장 조회 실패 — 조용히 삼키지 않고 에러/재시도 UI 로 노출
            console.warn('[OwnerDashboard] load failed', e);
            setError(true);
            setLoaded(true);
        }
    }, [selectedStoreId]);

    // 포커스마다 재조회 — 출퇴근/직원 입사/매장 변경이 대시보드(출근 인원·직원 수·매장)에 즉시 반영.
    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    // 실시간 동기화 — 선택 매장의 출퇴근/직원 변경 시(보고 있는 동안) 대시보드 즉시 갱신.
    useStoreLiveSync(selectedStoreId ? [selectedStoreId] : [], () => load());

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setSetupRefreshKey(k => k + 1);
        setRefreshing(false);
    };

    const pending = today?.pendingEmployees ?? [];
    const allIn = today ? today.checkedInCount === today.totalActiveEmployees : false;

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
                    actions={[{
                        label: '알림',
                        icon: <Ionicons name="notifications-outline" size={20} color={c.brandPrimary} />,
                        accessibilityLabel: '알림',
                        onPress: () => navigation.navigate('NotificationCenter'),
                    }]}
                />
            }
            footer={
                <CtaStack>
                    <AppButton label="급여 정산하기" onPress={() => navigation.navigate('SalaryList')} />
                </CtaStack>
            }>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}>
                {isPastDue ? <PastDueBanner onPress={goReRegisterCard} /> : null}

                <StoreSelector stores={stores} selectedId={selectedStoreId} onSelect={setSelectedStoreId} />

                {/* 매장 설정 완성도 + 다음 한 가지 (GR-NEW-06) — 유령매장 절벽 완화 */}
                {selectedStoreId !== null ? (
                    <StoreSetupCard
                        storeId={selectedStoreId}
                        refreshKey={setupRefreshKey}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 동적 routeName(string) 디스패치: StoreSetupCard 가 런타임에 라우트명을 결정
                        onNavigate={(routeName, params) => navigation.navigate(routeName as any, params as any)}
                    />
                ) : null}

                {/* 숫자 히어로 — 이번 달 예상 인건비 */}
                <View style={styles.hero}>
                    <HeroNumber
                        label={`${user?.name ?? '사장님'}님, 이번 달 예상 인건비`}
                        value={formatMoney(monthly?.totalGross ?? 0)}
                        sub={`정산까지 ${monthly?.daysRemainingInMonth ?? 0}일 · 실수령 예상 ${formatMoney(monthly?.totalNet ?? 0)}`}
                        accent
                    />
                </View>

                {/* 오늘 처리할 일 — 네이비 히어로 카드 */}
                <AppCard variant="navy" hero style={styles.taskCard}>
                    <View style={styles.taskTop}>
                        <Ionicons
                            name={pending.length > 0 ? 'alert-circle' : 'checkmark-circle'}
                            size={22}
                            color={c.textInverse}
                        />
                        <AppText variant="headingSm" tone="inverse" style={styles.taskTitle}>
                            {pending.length > 0 ? `오늘 처리할 일 ${pending.length}건` : '오늘 처리할 일이 없어요'}
                        </AppText>
                    </View>
                    <AppText variant="bodyMd" tone="inverse" style={styles.taskSub}>
                        출근 {today?.checkedInCount ?? 0}/{today?.totalActiveEmployees ?? 0}명 · 총 근무 {(monthly?.totalWorkingHours ?? 0).toFixed(1)}h
                    </AppText>
                    <AppButton
                        label="이상 출퇴근 확인"
                        variant="secondary"
                        onPress={() => navigation.navigate('MissingAttendanceCenter')}
                        style={styles.taskCta}
                    />
                </AppCard>

                {/* 오늘 출근 현황 */}
                <View style={styles.section}>
                    <View style={styles.statusHeader}>
                        <AppText variant="headingSm">오늘 출근 현황</AppText>
                        <View style={styles.countPill}>
                            <Ionicons name="people-outline" size={16} color={allIn ? c.success : c.warning} />
                            <AppText variant="titleMd" style={{color: allIn ? c.success : c.warning}}>
                                {`${today?.checkedInCount ?? 0}/${today?.totalActiveEmployees ?? 0}`}
                            </AppText>
                        </View>
                    </View>
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

                {/* 빠른 메뉴 — 토스식 큰 리스트 (4분할 아이콘 그리드 제거) */}
                <View style={styles.section}>
                    <AppText variant="headingSm" style={styles.sectionTitle}>빠르게 하기</AppText>
                    <View style={styles.list}>
                        <AppListItem
                            title="직원 추가"
                            subtitle="새 직원 초대·시급 설정"
                            left={<Ionicons name="people-outline" size={24} color={c.brandPrimary} />}
                            right="›"
                            onPress={() => {
                                // StoreDetail 은 storeId 필수 — 미선택 시 진입 차단(빈 파라미터 크래시 방지)
                                if (selectedStoreId !== null) {
                                    navigation.navigate('StoreDetail', {storeId: selectedStoreId});
                                }
                            }}
                        />
                        <AppListItem
                            title="위치·반경 설정"
                            subtitle="출퇴근 인증 반경 조정"
                            left={<Ionicons name="location-outline" size={24} color={c.brandPrimary} />}
                            right="›"
                            onPress={() => navigation.navigate('StoreRegistration')}
                        />
                        <AppListItem
                            title="노무·세무 팁"
                            subtitle="사장님을 위한 안내"
                            left={<Ionicons name="book-outline" size={24} color={c.brandPrimary} />}
                            right="›"
                            onPress={() => navigation.navigate('InfoList')}
                        />
                        <AppListItem
                            testID="owner-quick-menu-job-seekers"
                            title="주변 구직자·채용"
                            subtitle="반경 4km 인증 구직자 확인"
                            left={<Ionicons name="person-add-outline" size={24} color={recruit.primary} />}
                            right="›"
                            onPress={() => {
                                // JobSeekerList 는 storeId 필수 — 미선택 시 진입 차단(빈 파라미터 크래시 방지)
                                if (selectedStoreId !== null) {
                                    navigation.navigate('JobSeekerList', {storeId: selectedStoreId});
                                }
                            }}
                        />
                    </View>
                </View>

                {/* 인사이트 */}
                <AppCard variant="warm" style={styles.insightCard}>
                    <View style={styles.insightTop}>
                        <Ionicons name="bulb-outline" size={20} color={c.brandPrimary} />
                        <AppText variant="titleMd" style={styles.insightTitle}>인사이트</AppText>
                    </View>
                    <AppText variant="bodyMd" tone="secondary" style={styles.insightBody}>
                        이번 달 야간 근무가 지난달 대비 늘었어요. 정산 전 연장·야간 수당을 확인하세요.
                    </AppText>
                    <View style={styles.insightAmountRow}>
                        <AppText variant="caption" tone="tertiary">이번 달 누적 급여</AppText>
                        <AmountText size={26} tone="primary">{formatMoney(monthly?.totalGross ?? 0)}</AmountText>
                    </View>
                </AppCard>
            </ScrollView>
        </ScreenContainer>
    );
};

const ManagerDashboardContent: React.FC<{storeId: number}> = ({storeId}) => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const c = useThemeColors();
    const managedStores = useManagedStores();
    const delegation = managedStores.data?.find(store => store.storeId === storeId && store.active);
    const [today, setToday] = useState<TodayStats | null>(null);
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        try {
            setError(false);
            const {data} = await api.get<TodayStats>(`/api/store-queries/${storeId}/stats/today`);
            setToday(data);
        } catch (e) {
            console.warn('[ManagerDashboard] load failed', e);
            setError(true);
        }
    }, [storeId]);

    useFocusEffect(useCallback(() => {
        managedStores.refetch();
        load();
        // The query observer object changes as data arrives; refetch itself is the stable dependency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, managedStores.refetch]));
    useStoreLiveSync([storeId], load);

    const has = (permission: ManagerPermission) => delegation?.permissions.includes(permission) === true;
    if (error) {
        return <ScreenContainer header={<AppHeader title="매장 운영" onBack={() => navigation.goBack()} />}>
            <ErrorState title="운영 현황을 불러오지 못했어요" description="위임 상태와 네트워크를 확인해 주세요."
                primary={{label: '다시 시도', onPress: load}} />
        </ScreenContainer>;
    }
    if (managedStores.isLoading || !today) {
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
                    setRefreshing(true);
                    await Promise.all([load(), managedStores.refetch()]);
                    setRefreshing(false);
                }} />}>
                <AppCard variant="navy" hero style={styles.taskCard}>
                    <AppText variant="caption" tone="inverse">매니저 운영 모드</AppText>
                    <AppText variant="headingSm" tone="inverse">
                        오늘 출근 {today.checkedInCount}/{today.totalActiveEmployees}명
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={styles.taskSub}>
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
    hero: {marginTop: spacing.sm},
    taskCard: {gap: spacing.xs},
    taskTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    taskTitle: {flexShrink: 1},
    taskSub: {marginTop: spacing.xs, opacity: 0.85},
    taskCta: {marginTop: spacing.lg},
    section: {gap: spacing.md},
    sectionTitle: {marginBottom: spacing.xs},
    statusHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    countPill: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
    list: {gap: spacing.sm},
    allInRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    allInText: {flexShrink: 1},
    insightCard: {gap: spacing.sm},
    insightTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    insightTitle: {flexShrink: 1},
    insightBody: {marginTop: spacing.xs, lineHeight: 22},
    insightAmountRow: {marginTop: spacing.md, gap: 2},
});

export default OwnerDashboardScreen;
