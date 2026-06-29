/* eslint-disable react-native/no-color-literals -- 브랜드 히어로 위 흰 오버레이/구분선 고정(레거시 화면, P2 재디자인 대상) */
import {AppToast, AppBadge, AppCard, AppHeader, AppText, AmountText, HeroNumber, ScreenContainer} from '../../../common/components/ds';
import React, { useState, useCallback, useRef } from 'react';
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
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {gradient, radius, shadow, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {useAuth} from '../../../contexts/AuthContext';
import policyService from '../../info/services/policyService';
import storeService from '../../store/services/storeService';
import {useStoreLiveSync} from '../../../common/hooks/useStoreLiveSync';
import laborInfoService from '../../../services/laborInfoService';
import SectionCard from '../../../common/components/sections/SectionCard';
import SectionHeader from '../../../common/components/sections/SectionHeader';
import { InfoSlot } from '../components/RoleSlots';

interface MasterMyPageScreenProps {
    navigation: NavigationProp<any>;
}

interface StoreInfo {
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

interface PolicyInfo {
    id: number;
    title: string;
    category: string;
    deadline: string;
    description: string;
    isNew: boolean;
}

interface LaborInfo {
    minimumWage: number;
    year: number;
    weeklyMaxHours: number;
    overtimeRate: number;
}

interface QuickMenu {
    key: string;
    label: string;
    icon: string;
    onPress: () => void;
    disabled?: boolean;
}

export default function MasterMyPageScreen({ navigation }: MasterMyPageScreenProps) {
    const c = useThemeColors();
    const { user } = useAuth();
    // 반응형: 회전/폴더블 대응 (모듈레벨 Dimensions.get 금지 — useWindowDimensions)
    const { width } = useWindowDimensions();
    const CARD_WIDTH = width * 0.85;
    const [stores, setStores] = useState<StoreInfo[]>([]);
    const [policies, setPolicies] = useState<PolicyInfo[]>([]);
    const [laborInfo, setLaborInfo] = useState<LaborInfo | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [masterInfo, setMasterInfo] = useState({
        name: '',
        businessLicenseNumber: '',
        totalStores: 0,
        totalEmployees: 0,
        monthlyTotalLaborCost: 0,
    });

    const storeScrollRef = useRef<FlatList>(null);

    // 화면 포커스마다 재조회 — 매장 등록/삭제 등 다른 화면에서 돌아왔을 때도 최신 매장 목록 반영.
    // (mount-only useEffect 였을 때는 매장 신규 등록 후 복귀해도 화면이 갱신되지 않았다.)
    useFocusEffect(
        // eslint-disable-next-line react-hooks/exhaustive-deps
        useCallback(() => {
            loadData();
        }, [user?.id]),
    );

    // 실시간 동기화 — 내 매장에서 직원 입사·출퇴근 발생 시(다른 기기/직원), 화면을 보고 있는 동안 즉시 갱신.
    useStoreLiveSync(stores.map(s => s.id), () => loadData());

    const loadData = async () => {
        try {
            // 인증된 사장 본인의 id 로 조회 (하드코딩 금지 — BOLA 가드가 타인 id 차단)
            const userId = user?.id;
            if (!userId) {
                return;
            }

            // Store API 호출
            const storeData = await storeService.getMasterStores(userId);

            // StoreSummaryDto를 StoreInfo 형식으로 매핑
            const apiStores: StoreInfo[] = storeData.map(store => ({
                id: store.id,
                storeName: store.storeName,
                businessNumber: store.businessNumber ?? '',
                storePhoneNumber: store.storePhoneNumber ?? '',
                businessType: store.businessType ?? '',
                storeCode: store.storeCode ?? '',
                fullAddress: store.fullAddress ?? '',
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- wage of 0 should fall back to default minimum wage, so ?? would be wrong
                storeStandardHourWage: store.storeStandardHourWage || 9620,
                monthlyLaborCost: store.monthlyLaborCost ?? 0,
                employeeCount: store.employeeCount ?? 0,
                todayAttendance: store.todayAttendance ?? 0,
                monthlyRevenue: store.monthlyRevenue ?? 0,
            }));

            // 매장·기본정보를 먼저 반영 — 아래 정책/노무 API 실패가 매장 표시를 막지 않도록(독립).
            setStores(apiStores);
            setMasterInfo(prev => ({
                ...prev,
                name: user?.name ?? prev.name,
                totalStores: apiStores.length,
                totalEmployees: apiStores.reduce((s, st) => s + st.employeeCount, 0),
                monthlyTotalLaborCost: apiStores.reduce((s, st) => s + st.monthlyLaborCost, 0),
            }));

            // 정책 정보(보조): 실패해도 매장 화면·새로고침을 막지 않도록 비치명 처리.
            try {
                const policyDtos: any[] = await policyService.getPoliciesByCategory('ALL');
                const mockPolicies: PolicyInfo[] = (policyDtos || []).slice(0, 3).map((dto: any) => {
                    const createdAt = dto.publishDate || dto.createdAt || new Date().toISOString();
                    const updatedAt = dto.updatedAt || createdAt;
                    const isNew = (() => {
                        try {
                            const created = new Date(createdAt).getTime();
                            return Date.now() - created < 7 * 24 * 60 * 60 * 1000; // 7일 이내
                        } catch {
                            return false;
                        }
                    })();
                    const deadline = (updatedAt || '').toString().slice(0, 10);
                    return {
                        id: Number(dto.id),
                        title: dto.title || '',
                        category: '국가정책',
                        deadline,
                        description: (dto.content ? String(dto.content).slice(0, 80) : '').trim(),
                        isNew,
                    } as PolicyInfo;
                });
                setPolicies(mockPolicies);
            } catch (_) { /* 정책 로드 실패 — 보조 정보라 무시 */ }

            // 노무 정보(보조): 현재 적용 노무정보 미설정(400) 등은 무시. 새로고침 실패 토스트 방지.
            try {
                const laborData = await laborInfoService.getCurrentLaborInfo();
                setLaborInfo({
                    minimumWage: laborData.minimumWage,
                    year: laborData.year,
                    weeklyMaxHours: laborData.weeklyMaxHours,
                    overtimeRate: laborData.overtimeRate,
                });
            } catch (_) { /* 노무 정보 미설정 등 — 보조 정보라 무시 */ }

        } catch (error) {
            AppToast.error('데이터를 불러오는데 실패했어요.');
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const handleStorePress = (store: StoreInfo) => {
        navigation.navigate('StoreDetail', { storeId: store.id });
    };

    const handlePolicyPress = (policy: PolicyInfo) => {
        navigation.navigate('PolicyDetail', { policyId: policy.id });
    };

    const handleAddStore = () => {
        // HomeNavigator에 등록된 라우트로 이동
        navigation.navigate('StoreRegistration');
    };

    // 빠른 메뉴 — 매장 의존 화면은 첫 매장 기준으로 진입. 매장이 없으면 등록 유도.
    const primaryStoreId = stores[0]?.id;

    const handleQuickEmployee = () => {
        if (primaryStoreId === undefined) {
            AppToast.show('먼저 매장을 등록해 주세요.');
            handleAddStore();
            return;
        }
        // 직원 관리는 매장 운영(StoreDetail)과 분리 — 직원 명부 전용 화면으로.
        navigation.navigate('EmployeeManagement', {storeId: primaryStoreId});
    };

    const handleQuickAttendance = () => {
        // 사장용 근태 관리: 직원 출퇴근 이상(누락) 센터로. ('Attendance'는 본인 출퇴근(NFC) 화면이라 부적절)
        navigation.navigate('MissingAttendanceCenter');
    };

    const handleQuickPayroll = () => {
        if (primaryStoreId === undefined) {
            AppToast.show('먼저 매장을 등록해 주세요.');
            handleAddStore();
            return;
        }
        navigation.navigate('PayrollRun', {storeId: primaryStoreId});
    };

    const handleQuickDashboard = () => {
        navigation.navigate('OwnerDashboard');
    };

    const handleQuickSchedule = () => {
        if (primaryStoreId === undefined) {
            AppToast.show('먼저 매장을 등록해 주세요.');
            handleAddStore();
            return;
        }
        navigation.navigate('StoreSchedule', {storeId: primaryStoreId});
    };

    const handleComingSoon = () => {
        AppToast.show('준비중입니다.');
    };

    const handleQuickApproval = () => {
        if (primaryStoreId === undefined) {
            AppToast.show('먼저 매장을 등록해 주세요.');
            handleAddStore();
            return;
        }
        navigation.navigate('AttendanceApproval', {storeId: primaryStoreId});
    };

    const quickMenus: QuickMenu[] = [
        {key: 'employee', label: '직원 관리', icon: 'people-outline', onPress: handleQuickEmployee},
        {key: 'attendance', label: '근태 관리', icon: 'time-outline', onPress: handleQuickAttendance},
        {key: 'payroll', label: '급여 관리', icon: 'card-outline', onPress: handleQuickPayroll},
        {key: 'dashboard', label: '대시보드', icon: 'grid-outline', onPress: handleQuickDashboard},
        {key: 'schedule', label: '스케줄', icon: 'calendar-outline', onPress: handleQuickSchedule},
        {key: 'approval', label: '출근 승인', icon: 'checkmark-done-outline', onPress: handleQuickApproval},
        {key: 'comingSoon2', label: '준비중', icon: 'hourglass-outline', onPress: handleComingSoon, disabled: true},
        {key: 'comingSoon3', label: '준비중', icon: 'hourglass-outline', onPress: handleComingSoon, disabled: true},
    ];

    const renderStoreCard = ({ item: store }: { item: StoreInfo }) => (
        <TouchableOpacity
            style={[styles.storeCard, {width: CARD_WIDTH}]}
            onPress={() => handleStorePress(store)}
            activeOpacity={0.85}
        >
            <LinearGradient
                colors={gradient.brand}
                style={styles.storeCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.storeCardHeader}>
                    <AppText variant="headingSm" tone="inverse" numberOfLines={1} style={styles.storeName}>{store.storeName}</AppText>
                    <View style={styles.storeTypeTag}>
                        <AppText variant="caption" tone="inverse" weight="600" numberOfLines={1}>{store.businessType}</AppText>
                    </View>
                </View>

                <View style={styles.storeStats}>
                    <View style={styles.statItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statLabel}>이번달 인건비</AppText>
                        <AmountText size={18} tone="inverse">{formatCurrency(store.monthlyLaborCost)}원</AmountText>
                    </View>

                    <View style={styles.statItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statLabel}>직원 수</AppText>
                        <AppText variant="headingSm" tone="inverse">{store.employeeCount}명</AppText>
                    </View>
                </View>

                <View style={styles.storeStats}>
                    <View style={styles.statItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statLabel}>오늘 출근</AppText>
                        <AppText variant="headingSm" tone="inverse">{store.todayAttendance}명</AppText>
                    </View>

                    <View style={styles.statItem}>
                        <AppText variant="caption" tone="inverse" style={styles.statLabel}>이번달 매출</AppText>
                        <AmountText size={18} tone="inverse">{formatCurrency(store.monthlyRevenue)}원</AmountText>
                    </View>
                </View>

                <View style={styles.storeFooter}>
                    <AppText variant="caption" tone="inverse" numberOfLines={1} style={styles.storeAddress}>{store.fullAddress}</AppText>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const renderPolicyCard = (policy: PolicyInfo) => (
        <AppCard
            key={policy.id}
            variant="plain"
            onPress={() => handlePolicyPress(policy)}
            style={styles.policyCard}
        >
            <View style={styles.policyTitleRow}>
                <AppText variant="titleMd" numberOfLines={1} style={styles.policyTitle}>{policy.title}</AppText>
                {policy.isNew && <AppBadge label="NEW" tone="info" />}
            </View>
            <View style={styles.policyCategoryTag}>
                <AppText variant="caption" tone="secondary" weight="600">{policy.category}</AppText>
            </View>

            <AppText variant="bodyMd" tone="secondary" numberOfLines={2} style={styles.policyDescription}>{policy.description}</AppText>

            <View style={styles.policyFooter}>
                <AppText variant="caption" tone="tertiary">마감: {policy.deadline}</AppText>
                <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </View>
        </AppCard>
    );

    return (
        <ScreenContainer
            padded={false}
            header={
                <AppHeader
                    title="내 정보"
                    actions={[
                        {label: '알림', onPress: () => navigation.navigate('NotificationCenter')},
                        {label: '설정', onPress: () => navigation.navigate('AccountSettings')},
                    ]}
                />
            }>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* 인사 */}
                <View style={styles.header}>
                    <AppText variant="headingMd">안녕하세요, {user?.name ?? masterInfo.name ?? '사장'}님</AppText>
                    <AppText variant="bodyMd" tone="secondary" style={styles.subGreeting}>오늘도 화이팅하세요!</AppText>
                </View>

                {/* 전체 현황 — 히어로 숫자(이번달 총 인건비) */}
                <View style={styles.sectionPadded}>
                    <AppCard variant="hero">
                        <HeroNumber
                            label="이번달 총 인건비"
                            value={`${formatCurrency(masterInfo.monthlyTotalLaborCost)}원`}
                            sub={`운영 매장 ${masterInfo.totalStores}개 · 전체 직원 ${masterInfo.totalEmployees}명`}
                            accent
                        />
                    </AppCard>
                </View>

                {/* 매장 목록 */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <AppText variant="headingSm">내 매장</AppText>
                        <TouchableOpacity onPress={handleAddStore}>
                            <AppText variant="titleMd" tone="brand">매장 추가</AppText>
                        </TouchableOpacity>
                    </View>

                    {stores.length === 0 ? (
                        <View style={styles.sectionPadded}>
                            <AppCard variant="plain" style={styles.emptyStateCard}>
                                <Ionicons name="storefront-outline" size={40} color={c.textTertiary} />
                                <AppText variant="titleMd" center style={styles.emptyStateTitle}>등록된 매장이 없어요</AppText>
                                <AppText variant="bodyMd" tone="secondary" center style={styles.emptyStateDesc}>매장을 추가하고 직원과 급여를 관리해보세요</AppText>
                                <TouchableOpacity style={[styles.addStoreButton, {backgroundColor: c.brandPrimary}]} onPress={handleAddStore}>
                                    <AppText variant="titleMd" tone="inverse" weight="700">매장 추가하기</AppText>
                                </TouchableOpacity>
                            </AppCard>
                        </View>
                    ) : (
                        <FlatList
                            ref={storeScrollRef}
                            data={stores}
                            renderItem={renderStoreCard}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={CARD_WIDTH + spacing.lg}
                            decelerationRate="fast"
                            contentContainerStyle={styles.storeList}
                        />
                    )}
                </View>

                {/* 빠른 메뉴 */}
                <View style={styles.sectionPadded}>
                    <AppText variant="headingSm" style={styles.quickMenuTitle}>매장 관리</AppText>
                    <View style={styles.quickMenuGrid}>
                        {quickMenus.map(menu => (
                            <TouchableOpacity
                                key={menu.key}
                                style={[styles.quickMenuItem, menu.disabled && styles.quickMenuItemDisabled]}
                                onPress={menu.onPress}
                                disabled={menu.disabled}
                            >
                                <View style={[styles.quickMenuIcon, {backgroundColor: menu.disabled ? c.surfaceMuted : c.brandPrimarySoft}]}>
                                    <Ionicons name={menu.icon} size={24} color={menu.disabled ? c.textTertiary : c.brandPrimary} />
                                </View>
                                <AppText variant="caption" tone={menu.disabled ? 'tertiary' : 'secondary'} center numberOfLines={1}>{menu.label}</AppText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 정부 정책 정보 */}
                <InfoSlot testID="slotInfoPolicies">
                <View style={styles.sectionPadded}>
                    <SectionCard>
                        <SectionHeader
                          title="정부 지원 정책"
                          onPressAction={() => navigation.navigate('InfoList')}
                          actionLabel="더보기"
                        />
                        <View style={styles.policyList}>
                            {policies.map(renderPolicyCard)}
                        </View>
                    </SectionCard>
                </View>
                </InfoSlot>

                {/* 노무 정보 */}
                {laborInfo && (
                    <InfoSlot testID="slotInfoLabor">
                    <View style={styles.sectionPadded}>
                        <SectionCard>
                            <SectionHeader title={`${laborInfo.year}년 노무 정보`} onPressAction={() => navigation.navigate('InfoList')} actionLabel="자세히" />
                            <View style={styles.laborInfoGrid}>
                                <View style={styles.laborInfoItem}>
                                    <AppText variant="caption" tone="secondary" center style={styles.laborInfoLabel}>최저임금</AppText>
                                    <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(laborInfo.minimumWage)}원</AppText>
                                </View>
                                <View style={styles.laborInfoItem}>
                                    <AppText variant="caption" tone="secondary" center style={styles.laborInfoLabel}>주 최대 근무시간</AppText>
                                    <AppText variant="titleMd">{laborInfo.weeklyMaxHours}시간</AppText>
                                </View>
                                <View style={styles.laborInfoItem}>
                                    <AppText variant="caption" tone="secondary" center style={styles.laborInfoLabel}>연장근무 수당</AppText>
                                    <AppText variant="titleMd">{laborInfo.overtimeRate}배</AppText>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.laborInfoButton, {borderTopColor: c.divider}]} onPress={() => navigation.navigate('InfoList')}>
                                <AppText variant="titleMd" tone="brand">근로기준법 자세히 보기</AppText>
                                <Ionicons name="chevron-forward" size={16} color={c.brandPrimary} />
                            </TouchableOpacity>
                        </SectionCard>
                    </View>
                    </InfoSlot>
                )}

                {/* 하단 여백 */}
                <View style={styles.bottomSpacing} />
            </ScrollView>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: spacing.sm,
    },
    header: {
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.lg,
    },
    subGreeting: {
        marginTop: spacing.xs,
    },
    section: {
        marginBottom: spacing.xxl,
    },
    sectionPadded: {
        paddingHorizontal: spacing.xxl,
        marginBottom: spacing.xxl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xxl,
        marginBottom: spacing.lg,
    },
    storeList: {
        paddingLeft: spacing.xxl,
    },
    storeCard: {
        marginRight: spacing.lg,
        borderRadius: radius.xxl,
        overflow: 'hidden',
        ...shadow.lg,
    },
    storeCardGradient: {
        padding: spacing.xl,
    },
    storeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    storeName: {
        flex: 1,
        marginRight: spacing.sm,
    },
    storeTypeTag: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.md,
        flexShrink: 0,
    },
    storeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.lg,
        marginBottom: spacing.md,
    },
    statItem: {
        flex: 1,
        minWidth: 0,
    },
    statLabel: {
        opacity: 0.85,
        marginBottom: spacing.xs,
    },
    storeFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    storeAddress: {
        flex: 1,
        opacity: 0.85,
        marginRight: spacing.sm,
    },
    quickMenuTitle: {
        marginBottom: spacing.lg,
    },
    quickMenuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    quickMenuItem: {
        width: '25%',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    quickMenuItemDisabled: {
        opacity: 0.7,
    },
    quickMenuIcon: {
        width: 56,
        height: 56,
        borderRadius: radius.pill,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    emptyStateCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyStateTitle: {
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    emptyStateDesc: {
        marginBottom: spacing.lg,
    },
    addStoreButton: {
        borderRadius: radius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
    },
    policyList: {
        gap: spacing.md,
    },
    policyCard: {
        marginBottom: 0,
    },
    policyTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    policyTitle: {
        flex: 1,
    },
    policyCategoryTag: {
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    policyDescription: {
        marginBottom: spacing.md,
    },
    policyFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    laborInfoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    laborInfoItem: {
        flex: 1,
        alignItems: 'center',
        minWidth: 0,
    },
    laborInfoLabel: {
        marginBottom: spacing.xs,
    },
    laborInfoButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
    },
    bottomSpacing: {
        height: spacing.huge,
    },
});
