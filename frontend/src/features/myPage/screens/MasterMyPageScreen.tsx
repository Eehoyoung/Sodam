/* eslint-disable react-native/no-color-literals -- 히어로/그라디언트/데코 고정 색 */
import React, {useState, useCallback, useRef} from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    FlatList,
    RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {NavigationProp, useFocusEffect} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {gradient, radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {AppToast, AppText, AmountText, QuickMenuGrid, ScreenContainer} from '../../../common/components/ds';
import {useAuth} from '../../../contexts/AuthContext';
import policyService from '../../info/services/policyService';
import storeService from '../../store/services/storeService';
import {useStoreLiveSync} from '../../../common/realtime/useStoreLiveSync';
import laborInfoService from '../../../services/laborInfoService';
import {InfoSlot} from '../components/RoleSlots';
import RoleTabBar from '../../../common/components/navigation/RoleTabBar';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import {fetchStoreApprovals} from '../../attendance/services/attendanceApprovalService';
import timeOffService from '../services/timeOffService';

interface MasterMyPageScreenProps {
    navigation: NavigationProp<any>;
    visualFixture?: MasterMyPageVisualFixture;
}

export interface StoreInfo {
    id: number;
    storeName: string;
    businessNumber: string;
    storePhoneNumber: string;
    businessType: string;
    storeCode: string;
    fullAddress: string;
    storeStandardHourWage: number;
    monthlyLaborCost: number;
    employeeCount: number;
    todayAttendance: number;
    monthlyRevenue: number;
}

export interface PolicyInfo {
    id: number;
    title: string;
    category: string;
    deadline: string;
    description: string;
    isNew: boolean;
}

export interface LaborInfo {
    minimumWage: number;
    year: number;
    weeklyMaxHours: number;
    overtimeRate: number;
}

/** 개발용 시각 검증 전용 — 매장 목록/정책/노무정보/승인 대기 건수 조회를 모두 고정 데이터로 대체한다. */
export interface MasterMyPageVisualFixture {
    stores: StoreInfo[];
    policies?: PolicyInfo[];
    laborInfo?: LaborInfo | null;
    pendingCount?: number;
    timeOffPendingCount?: number;
    masterInfo?: {
        name: string;
        totalStores: number;
        totalEmployees: number;
        monthlyTotalLaborCost: number;
    };
    /** 인사말 아래 날짜 라벨 계산을 고정하는 캡처 시각(ms) — 없으면 Date.now() 사용. */
    nowMs?: number;
}

// 매장마다 다른 그라디언트 색으로 구분 — v3 링&패스 토큰(코랄/틸/앰버/코랄→틸 링)
const STORE_GRADIENTS: Array<[string, string]> = [
    gradient.brand,
    gradient.success,
    gradient.warning,
    gradient.ring,
];

/**
 * 153 MasterMyPage — 사장 "홈" 랜딩 (RoleTabBar MASTER_TABS 의 home 탭 대상).
 * v3 시안: docs/260720/artifacts/sodam-v3-02-owner.html의 "153 MasterMyPage" 카드.
 * 인사말+날짜 → 총 인건비 히어로(운영매장/전체직원/오늘출근 3분할) → 오늘의 현황
 * (근무중/지각/미출근 + 출근률 바) → 내 매장 그라디언트 캐러셀 → 매장관리 QuickMenuGrid
 * → 정책/노무 정보 카드 순서로 시안과 1:1 대응.
 */
export default function MasterMyPageScreen({navigation, visualFixture}: MasterMyPageScreenProps) {
    const c = useThemeColors();
    const {user} = useAuth();
    const {width} = useWindowDimensions();

    const CARD_WIDTH = width * 0.75;

    const [stores, setStores] = useState<StoreInfo[]>(visualFixture?.stores ?? []);
    const [policies, setPolicies] = useState<PolicyInfo[]>(visualFixture?.policies ?? []);
    const [laborInfo, setLaborInfo] = useState<LaborInfo | null>(visualFixture?.laborInfo ?? null);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingCount, setPendingCount] = useState(visualFixture?.pendingCount ?? 0);
    const [timeOffPendingCount, setTimeOffPendingCount] = useState(visualFixture?.timeOffPendingCount ?? 0);
    const [masterInfo, setMasterInfo] = useState({
        name: '',
        totalStores: 0,
        totalEmployees: 0,
        monthlyTotalLaborCost: 0,
        ...visualFixture?.masterInfo,
    });

    const storeScrollRef = useRef<FlatList>(null);

    useFocusEffect(
        useCallback(() => {
            if (visualFixture) {
                return;
            }
            loadData();
            // The loadData function is declared later in the component; referencing it here is intentional.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [user?.id, visualFixture]),
    );

    useStoreLiveSync(visualFixture ? [] : stores.map(s => s.id), () => {
        if (!visualFixture) {
            loadData();
        }
    });

    const loadData = async () => {
        if (visualFixture) {
            return;
        }
        try {
            const userId = user?.id;
            if (!userId) {return;}

            const storeData = await storeService.getMasterStores(userId);
            const apiStores: StoreInfo[] = storeData.map(store => ({
                id: store.id,
                storeName: store.storeName,
                businessNumber: store.businessNumber ?? '',
                storePhoneNumber: store.storePhoneNumber ?? '',
                businessType: store.businessType ?? '',
                storeCode: store.storeCode ?? '',
                fullAddress: store.fullAddress ?? '',
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                storeStandardHourWage: store.storeStandardHourWage || 9620,
                monthlyLaborCost: store.monthlyLaborCost ?? 0,
                employeeCount: store.employeeCount ?? 0,
                todayAttendance: store.todayAttendance ?? 0,
                monthlyRevenue: store.monthlyRevenue ?? 0,
            }));

            setStores(apiStores);
            setMasterInfo(prev => ({
                ...prev,
                name: user?.name ?? prev.name,
                totalStores: apiStores.length,
                totalEmployees: apiStores.reduce((s, st) => s + st.employeeCount, 0),
                monthlyTotalLaborCost: apiStores.reduce((s, st) => s + st.monthlyLaborCost, 0),
            }));

            // 대기 승인 건수 (첫 번째 매장)
            if (apiStores.length > 0) {
                try {
                    const pending = await fetchStoreApprovals(apiStores[0].id, 'PENDING');
                    setPendingCount(Array.isArray(pending) ? pending.length : 0);
                } catch {setPendingCount(0);}
            }

            // 대기 중인 휴가 신청 건수(본인 소유 전 매장 통합)
            try {
                const pendingTimeOffs = await timeOffService.fetchPendingTimeOffs();
                setTimeOffPendingCount(pendingTimeOffs.length);
            } catch {setTimeOffPendingCount(0);}

            try {
                const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
                setPolicies((policyDtos || []).slice(0, 3).map((dto: any) => {
                    const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
                    const isNew = Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
                    return {
                        id: Number(dto.id),
                        title: dto.title || '',
                        category: '국가정책',
                        deadline: (dto.updatedAt || createdAt).toString().slice(0, 10),
                        description: (dto.content ? String(dto.content).slice(0, 80) : '').trim(),
                        isNew,
                    };
                }));
            } catch {/* 보조 정보 무시 */}

            try {
                const laborData = await laborInfoService.getCurrentLaborInfo();
                setLaborInfo({
                    minimumWage: laborData.minimumWage,
                    year: laborData.year,
                    weeklyMaxHours: laborData.weeklyMaxHours,
                    overtimeRate: laborData.overtimeRate,
                });
            } catch {/* 보조 정보 무시 */}

        } catch {
            AppToast.error('데이터를 불러오는데 실패했어요.');
        }
    };

    const onRefresh = async () => {
        if (visualFixture) {
            return;
        }
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const fmt = (n: number) => new Intl.NumberFormat('ko-KR').format(n);

    const today = new Date(visualFixture?.nowMs ?? Date.now());
    const dateLabel = today.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    });

    // 오늘 출근 통계
    const totalToday = stores.reduce((s, st) => s + st.todayAttendance, 0);
    const totalEmp = masterInfo.totalEmployees;
    const attendancePct = totalEmp > 0 ? Math.round((totalToday / totalEmp) * 100) : 0;
    const absentCount = Math.max(0, totalEmp - totalToday);

    const primaryStoreId = stores[0]?.id;

    const requireStore = (fn: () => void) => () => {
        if (!primaryStoreId) {
            AppToast.show('먼저 매장을 등록해 주세요.');
            navigation.navigate('StoreRegistration');
            return;
        }
        fn();
    };

    // 첫 3개(직원 관리/스케줄/급여 관리) 순서·색상은 v3 시안 "153 MasterMyPage" qm-grid와
    // 1:1 대응(amber/teal/neutral) — QuickMenuGrid가 3열이라 이 3개가 첫 행에 그대로 노출된다.
    const quickMenus = [
        {
            key: 'employee', label: '직원 관리', icon: 'people-outline',
            onPress: requireStore(() => navigation.navigate('EmployeeManagement', {storeId: primaryStoreId})),
            color: {bg: c.warningBg, icon: c.warning},
        },
        {
            key: 'schedule', label: '스케줄', icon: 'calendar-outline',
            onPress: requireStore(() => navigation.navigate('StoreSchedule', {storeId: primaryStoreId})),
            color: {bg: c.infoBg, icon: c.info},
        },
        {
            key: 'payroll', label: '급여 관리', icon: 'card-outline',
            onPress: requireStore(() => navigation.navigate('PayrollRun', {storeId: primaryStoreId})),
            color: {bg: c.surfaceMuted, icon: c.textSecondary},
        },
        {
            key: 'attendance', label: '근태 관리', icon: 'time-outline',
            onPress: () => navigation.navigate('MissingAttendanceCenter'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'dashboard', label: '대시보드', icon: 'grid-outline',
            onPress: () => navigation.navigate('OwnerDashboard'),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'approval', label: '출근 승인', icon: 'checkmark-done-outline',
            onPress: requireStore(() => navigation.navigate('AttendanceApproval', {storeId: primaryStoreId})),
            color: {bg: c.warningBg, icon: c.warning},
            badge: pendingCount > 0 ? (pendingCount > 9 ? '9+' : String(pendingCount)) : undefined,
        },
        {
            key: 'timeOffApproval', label: '휴가 승인', icon: 'umbrella-outline',
            onPress: () => navigation.navigate('TimeOffApproval'),
            color: {bg: c.surfaceMint, icon: c.success},
            badge: timeOffPendingCount > 0 ? (timeOffPendingCount > 9 ? '9+' : String(timeOffPendingCount)) : undefined,
        },
        {
            key: 'dailySales', label: '매출 입력', icon: 'cash-outline',
            onPress: requireStore(() => navigation.navigate('DailySales', {storeId: primaryStoreId})),
            color: {bg: c.surfaceMint, icon: c.attendanceCheckedIn},
        },
        {
            key: 'laborRatio', label: '인건비율', icon: 'stats-chart-outline',
            onPress: requireStore(() => navigation.navigate('LaborCostRatio', {storeId: primaryStoreId})),
            color: {bg: c.infoBg, icon: c.info},
        },
        {
            key: 'laborRisk', label: '노무 리스크', icon: 'shield-checkmark-outline',
            onPress: requireStore(() => navigation.navigate('LaborRisk', {storeId: primaryStoreId})),
            color: {bg: c.errorBg, icon: c.error},
        },
        {
            key: 'attendanceIrregularity', label: '지각/조퇴/결근', icon: 'alert-circle-outline',
            onPress: requireStore(() => navigation.navigate('AttendanceIrregularities', {storeId: primaryStoreId})),
            color: {bg: c.warningBg, icon: c.warning},
        },
        {
            key: 'swapRequests', label: '대타 구하기', icon: 'swap-horizontal-outline',
            onPress: requireStore(() => navigation.navigate('SwapRequests', {storeId: primaryStoreId})),
            color: {bg: c.brandPrimarySoft, icon: c.brandPrimary},
        },
        {
            key: 'hiringCost', label: '채용 비용', icon: 'calculator-outline',
            onPress: () => navigation.navigate('HiringCost'),
            color: {bg: c.infoBg, icon: c.info},
        },
    ];

    const renderStoreCard = ({item: store, index}: {item: StoreInfo; index: number}) => {
        const gradColors = STORE_GRADIENTS[index % STORE_GRADIENTS.length];
        return (
            <TouchableOpacity
                style={[styles.storeCard, {width: CARD_WIDTH}]}
                onPress={() => navigation.navigate('StoreDetail', {storeId: store.id})}
                activeOpacity={0.88}>
                <LinearGradient colors={gradColors} style={styles.storeGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                    <View style={styles.storeDecor} />

                    <View style={styles.storeTop}>
                        <AppText variant="headingSm" tone="inverse" numberOfLines={1} style={styles.storeName}>
                            {store.storeName}
                        </AppText>
                        <View style={styles.storeTypeTag}>
                            <AppText variant="caption" tone="inverse" weight="600">{store.businessType || '기타'}</AppText>
                        </View>
                    </View>

                    <View style={styles.storeStats}>
                        <View style={styles.statItem}>
                            <AppText variant="caption" tone="inverse" style={styles.statLabel}>이번달 인건비</AppText>
                            <AmountText size={16} tone="inverse">{fmt(store.monthlyLaborCost)}원</AmountText>
                        </View>
                        <View style={styles.statItem}>
                            <AppText variant="caption" tone="inverse" style={styles.statLabel}>직원 수</AppText>
                            <AppText variant="headingSm" tone="inverse">{store.employeeCount}명</AppText>
                        </View>
                        <View style={styles.statItem}>
                            <AppText variant="caption" tone="inverse" style={styles.statLabel}>오늘 출근</AppText>
                            <AppText variant="headingSm" tone="inverse">{store.todayAttendance}명</AppText>
                        </View>
                    </View>

                    <View style={styles.storeFooter}>
                        <AppText variant="caption" tone="inverse" numberOfLines={1} style={styles.storeAddr}>
                            {store.fullAddress}
                        </AppText>
                        <View style={styles.storeQuickRow}>
                            <TouchableOpacity
                                style={styles.storeQuickBtn}
                                onPress={() => navigation.navigate('EmployeeManagement', {storeId: store.id})}>
                                <AppText variant="caption" tone="inverse" weight="700">직원</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.storeQuickBtn}
                                onPress={() => navigation.navigate('PayrollRun', {storeId: store.id})}>
                                <AppText variant="caption" tone="inverse" weight="700">급여</AppText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const nameInitial = (user?.name ?? masterInfo.name ?? '사').charAt(0);
    const showAlertStrip = pendingCount > 0 || timeOffPendingCount > 0;

    return (
        <ScreenContainer padded={false} footer={<RoleTabBar active="home" />}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}>

                {/* ── 커스텀 헤더 ── */}
                <View style={[styles.topHeader, {backgroundColor: c.surface, borderBottomColor: c.divider}]}>
                    <View style={styles.headerLeft}>
                        <LinearGradient colors={gradient.brand} style={styles.avatar}>
                            <AppText variant="titleMd" tone="inverse" weight="700">{nameInitial}</AppText>
                        </LinearGradient>
                        <View>
                            <AppText variant="titleMd" weight="700">
                                안녕하세요, {user?.name ?? masterInfo.name ?? '사장'}님 👋
                            </AppText>
                            <AppText variant="caption" tone="tertiary">{dateLabel}</AppText>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.iconBtn, {backgroundColor: c.surfaceCanvas, borderColor: c.border}]}
                            onPress={() => navigation.navigate('NotificationCenter')}>
                            <Ionicons name="notifications-outline" size={20} color={c.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconBtn, {backgroundColor: c.surfaceCanvas, borderColor: c.border}]}
                            onPress={() => navigation.navigate('Settings')}>
                            <Ionicons name="settings-outline" size={20} color={c.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── 액션 알림 스트립 (승인 대기 있을 때만) ── */}
                {showAlertStrip && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.alertStrip}
                        style={styles.alertStripWrap}>
                        <TouchableOpacity
                            style={[styles.alertChip, {backgroundColor: c.warningBg, borderColor: c.warning}]}
                            onPress={requireStore(() => navigation.navigate('AttendanceApproval', {storeId: primaryStoreId}))}>
                            <Ionicons name="time-outline" size={13} color={c.warning} />
                            <AppText variant="caption" weight="700" style={{color: c.warning}}>
                                출근 승인 {pendingCount}건 대기
                            </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.alertChip, {backgroundColor: c.errorBg, borderColor: c.error}]}
                            onPress={() => navigation.navigate('MissingAttendanceCenter')}>
                            <Ionicons name="warning-outline" size={13} color={c.error} />
                            <AppText variant="caption" weight="700" style={{color: c.error}}>
                                미처리 근태 확인
                            </AppText>
                        </TouchableOpacity>
                        {timeOffPendingCount > 0 ? (
                            <TouchableOpacity
                                style={[styles.alertChip, {backgroundColor: c.surfaceMint, borderColor: c.success}]}
                                onPress={() => navigation.navigate('TimeOffApproval')}>
                                <Ionicons name="umbrella-outline" size={13} color={c.success} />
                                <AppText variant="caption" weight="700" style={{color: c.success}}>
                                    휴가 승인 {timeOffPendingCount}건 대기
                                </AppText>
                            </TouchableOpacity>
                        ) : null}
                    </ScrollView>
                )}

                {/* ── 히어로 KPI 카드(153 MasterMyPage) ──
                    ⚠️ 'spot' 강조(코랄 테두리)는 OwnerDashboardScreen의 "오늘 처리할 일" 같은
                    CTA 콜아웃 전용 — 여기는 숫자 요약(KPI)이라 일반 카드 테두리를 쓴다. */}
                <View style={styles.section}>
                    <View style={[styles.heroCard, {backgroundColor: c.background, borderWidth: 1, borderColor: c.border}]}>
                        <AppText variant="caption" tone="secondary" style={styles.heroLabel}>이번달 총 인건비</AppText>
                        <AmountText size={28} tone="brand">{fmt(masterInfo.monthlyTotalLaborCost)}원</AmountText>
                        <View style={[styles.heroDivider, {backgroundColor: c.border}]} />
                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <AppText variant="headingSm" tone="primary">{masterInfo.totalStores}</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.heroStatLbl}>운영 매장</AppText>
                            </View>
                            <View style={[styles.heroStat, styles.heroStatDivider, {borderLeftColor: c.border}]}>
                                <AppText variant="headingSm" tone="primary">{masterInfo.totalEmployees}명</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.heroStatLbl}>전체 직원</AppText>
                            </View>
                            <View style={[styles.heroStat, styles.heroStatDivider, {borderLeftColor: c.border}]}>
                                <AppText variant="headingSm" tone="primary">{totalToday}명</AppText>
                                <AppText variant="caption" tone="secondary" style={styles.heroStatLbl}>오늘 출근</AppText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ── 오늘의 현황 ── */}
                {totalEmp > 0 && (
                    <View style={styles.section}>
                        <View style={[styles.card, {backgroundColor: c.surface, borderColor: c.border}]}>
                            <View style={styles.cardHeader}>
                                <AppText variant="titleMd" weight="700">오늘의 현황</AppText>
                                <TouchableOpacity onPress={() => navigation.navigate('MissingAttendanceCenter')}>
                                    <AppText variant="caption" weight="600" style={{color: c.brandPrimary}}>전체 보기 →</AppText>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.todayGrid}>
                                <View style={[styles.todayCell, {backgroundColor: c.surfaceMint, borderColor: c.successBg}]}>
                                    <AppText variant="headingMd" style={{color: c.attendanceCheckedIn}}>{totalToday}</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.todayCellLbl}>근무중</AppText>
                                </View>
                                <View style={[styles.todayCell, {backgroundColor: c.surfaceCanvas, borderColor: c.divider}]}>
                                    <AppText variant="headingMd" style={{color: c.warning}}>–</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.todayCellLbl}>지각</AppText>
                                </View>
                                <View style={[styles.todayCell, {backgroundColor: c.surfaceCanvas, borderColor: c.divider}]}>
                                    <AppText variant="headingMd" tone="tertiary">{absentCount}</AppText>
                                    <AppText variant="caption" tone="secondary" style={styles.todayCellLbl}>미출근</AppText>
                                </View>
                            </View>

                            <View style={styles.barWrap}>
                                <View style={styles.barLabelRow}>
                                    <AppText variant="caption" tone="secondary">출근률 · {totalToday}/{totalEmp}명</AppText>
                                    <AppText variant="caption" weight="700" style={{color: c.attendanceCheckedIn}}>{attendancePct}%</AppText>
                                </View>
                                <View style={[styles.bar, {backgroundColor: c.divider}]}>
                                    <View
                                        style={[styles.barFill, {
                                            width: `${attendancePct}%` as any,
                                            backgroundColor: c.attendanceCheckedIn,
                                        }]}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* ── 내 매장 ── */}
                <View style={styles.storeSection}>
                    <View style={styles.secRow}>
                        <AppText variant="headingSm">내 매장</AppText>
                        <TouchableOpacity onPress={() => navigation.navigate('StoreRegistration')}>
                            <AppText variant="caption" weight="700" style={{color: c.brandPrimary}}>매장 추가 +</AppText>
                        </TouchableOpacity>
                    </View>

                    {stores.length === 0 ? (
                        <View style={styles.section}>
                            <View style={[styles.card, styles.emptyCard, {backgroundColor: c.surface, borderColor: c.border}]}>
                                <Ionicons name="storefront-outline" size={40} color={c.textTertiary} />
                                <AppText variant="titleMd" weight="700" center style={{marginTop: spacing.md}}>등록된 매장이 없어요</AppText>
                                <AppText variant="bodyMd" tone="secondary" center style={{marginTop: spacing.xs}}>
                                    매장을 추가하고 직원과 급여를 관리해보세요
                                </AppText>
                                <TouchableOpacity
                                    style={[styles.addStoreBtn, {backgroundColor: c.brandPrimary}]}
                                    onPress={() => navigation.navigate('StoreRegistration')}>
                                    <AppText variant="titleMd" tone="inverse" weight="700">매장 추가하기</AppText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <FlatList
                            ref={storeScrollRef}
                            data={stores}
                            renderItem={renderStoreCard}
                            keyExtractor={item => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + spacing.md}
                            decelerationRate="fast"
                            contentContainerStyle={styles.storeList}
                        />
                    )}
                </View>

                {/* ── 매장 관리 퀵메뉴 (v3 공용 QuickMenuGrid, docs/260720 WP-02) ── */}
                <View style={styles.section}>
                    <AppText variant="headingSm" style={styles.secTitle}>매장 관리</AppText>
                    <QuickMenuGrid items={quickMenus} />
                </View>

                {/* ── 정부 지원 정책 ── */}
                <InfoSlot testID="slotInfoPolicies">
                    <View style={styles.section}>
                        <SectionCard>
                            <SectionHeader
                                title="정부 지원 정책"
                                onPressAction={() => navigation.navigate('InfoList')}
                                actionLabel="더보기"
                            />
                            <View style={styles.policyList}>
                                {policies.map(policy => (
                                    <TouchableOpacity
                                        key={policy.id}
                                        style={styles.policyRow}
                                        onPress={() => navigation.navigate('PolicyDetail', {policyId: policy.id})}>
                                        <View style={[styles.policyDot, {backgroundColor: c.brandPrimary}]} />
                                        <View style={styles.policyBody}>
                                            <View style={styles.policyTitleRow}>
                                                <AppText variant="titleMd" numberOfLines={1} style={styles.policyTitle}>
                                                    {policy.title}
                                                </AppText>
                                                {policy.isNew && (
                                                    <View style={[styles.newBadge, {backgroundColor: c.infoBg}]}>
                                                        <AppText variant="caption" weight="700" style={{color: c.info, fontSize: 10}}>
                                                            NEW
                                                        </AppText>
                                                    </View>
                                                )}
                                            </View>
                                            <AppText variant="caption" tone="tertiary">마감: {policy.deadline}</AppText>
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color={c.textTertiary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </SectionCard>
                    </View>
                </InfoSlot>

                {/* ── 노무 정보 ── */}
                {laborInfo && (
                    <InfoSlot testID="slotInfoLabor">
                        <View style={styles.section}>
                            <SectionCard>
                                <SectionHeader
                                    title={`${laborInfo.year}년 노무 정보`}
                                    onPressAction={() => navigation.navigate('InfoList')}
                                    actionLabel="자세히"
                                />
                                <View style={styles.laborGrid}>
                                    {[
                                        {label: '최저임금/시간', value: `${fmt(laborInfo.minimumWage)}원`},
                                        {label: '주 최대 근무', value: `${laborInfo.weeklyMaxHours}시간`},
                                        {label: '연장 수당', value: `×${laborInfo.overtimeRate}`},
                                    ].map(item => (
                                        <View
                                            key={item.label}
                                            style={[styles.laborCell, {backgroundColor: c.surfaceCanvas, borderColor: c.divider}]}>
                                            <AppText variant="titleMd" weight="700">{item.value}</AppText>
                                            <AppText variant="caption" tone="tertiary" center style={styles.laborLbl}>{item.label}</AppText>
                                        </View>
                                    ))}
                                </View>
                                <TouchableOpacity
                                    style={[styles.laborMoreBtn, {borderTopColor: c.divider}]}
                                    onPress={() => navigation.navigate('InfoList')}>
                                    <AppText variant="titleMd" style={{color: c.brandPrimary}}>근로기준법 자세히 보기</AppText>
                                    <Ionicons name="chevron-forward" size={16} color={c.brandPrimary} />
                                </TouchableOpacity>
                            </SectionCard>
                        </View>
                    </InfoSlot>
                )}

                <View style={styles.bottomSpace} />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollView: {flex: 1},

    /* ── 헤더 ── */
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerLeft: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1},
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
    },
    headerRight: {flexDirection: 'row', gap: spacing.sm},
    iconBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },

    /* ── 알림 스트립 ── */
    alertStripWrap: {paddingVertical: spacing.sm},
    alertStrip: {paddingHorizontal: spacing.xl, gap: spacing.sm},
    alertChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: spacing.md, paddingVertical: 7,
        borderRadius: radius.pill, borderWidth: 1,
    },

    /* ── 공통 섹션 ── */
    section: {paddingHorizontal: spacing.xl, marginBottom: spacing.xl},
    secRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.xl, marginBottom: spacing.md,
    },
    secTitle: {marginBottom: spacing.md},

    /* ── 히어로 카드 ── */
    heroCard: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.sm,
    },
    heroLabel: {marginBottom: spacing.xs},
    heroDivider: {height: 1, marginVertical: spacing.md},
    heroStats: {flexDirection: 'row'},
    heroStat: {flex: 1, alignItems: 'center', gap: 3},
    heroStatDivider: {borderLeftWidth: 1},
    heroStatLbl: {},

    /* ── 카드 공통 ── */
    card: {borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1},
    cardHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.md,
    },

    /* ── 오늘 현황 ── */
    todayGrid: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md},
    todayCell: {
        flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md,
        alignItems: 'center', borderWidth: 1,
    },
    todayCellLbl: {marginTop: 3},
    barWrap: {gap: spacing.xs},
    barLabelRow: {flexDirection: 'row', justifyContent: 'space-between'},
    bar: {height: 8, borderRadius: radius.pill, overflow: 'hidden'},
    barFill: {height: '100%', borderRadius: radius.pill},

    /* ── 매장 카드 ── */
    storeSection: {marginBottom: spacing.xl},
    storeList: {paddingLeft: spacing.xl},
    storeCard: {marginRight: spacing.md, borderRadius: radius.xxl, overflow: 'hidden', ...shadow.md},
    storeGradient: {padding: spacing.lg},
    storeDecor: {
        position: 'absolute', bottom: -20, right: -20,
        width: 90, height: 90,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 45,
    },
    storeTop: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: spacing.md,
    },
    storeName: {flex: 1, marginRight: spacing.sm},
    storeTypeTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.sm, paddingVertical: 3,
        borderRadius: radius.pill, flexShrink: 0,
    },
    storeStats: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md},
    statItem: {flex: 1},
    statLabel: {opacity: 0.8, marginBottom: 2},
    storeFooter: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
    },
    storeAddr: {flex: 1, opacity: 0.8, marginRight: spacing.sm},
    storeQuickRow: {flexDirection: 'row', gap: 6},
    storeQuickBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: radius.pill,
        paddingHorizontal: 10, paddingVertical: 4,
    },

    /* ── 퀵메뉴는 QuickMenuGrid(ds)로 승격됨(WP-02) ── */

    /* ── 빈 매장 ── */
    emptyCard: {alignItems: 'center', paddingVertical: spacing.xxxl},
    addStoreBtn: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
        borderRadius: radius.lg, alignItems: 'center',
    },

    /* ── 정책 ── */
    policyList: {gap: 0},
    policyRow: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    policyDot: {width: 6, height: 6, borderRadius: 3, flexShrink: 0},
    policyBody: {flex: 1, minWidth: 0},
    policyTitleRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2},
    policyTitle: {flex: 1},
    newBadge: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, flexShrink: 0},

    /* ── 노무 ── */
    laborGrid: {flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md},
    laborCell: {
        flex: 1, borderRadius: radius.lg, padding: spacing.sm,
        alignItems: 'center', borderWidth: 1,
    },
    laborLbl: {marginTop: 3},
    laborMoreBtn: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1,
    },

    bottomSpace: {height: spacing.huge},
});
