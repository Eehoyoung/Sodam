import React, {useCallback, useEffect, useState} from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {tokens} from '../../../theme/tokens';
import Card from '../../../common/components/data-display/Card';
import Badge from '../../../common/components/data-display/Badge';
import Button from '../../../common/components/form/Button';
import StoreSelector, {SelectableStore} from '../../../common/components/store/StoreSelector';
import {useAuth} from '../../../contexts/AuthContext';
import api from '../../../common/utils/api';

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
 * 사장님 홈 대시보드 (PRD_OWNER S-001).
 *
 * 데이터 소스:
 *  - GET /api/store-queries/{storeId}/stats/today
 *  - GET /api/store-queries/{storeId}/stats/payroll/month-to-date
 *
 * 백엔드 미구현 시 fallback 데이터로 표시 (앱 크래시 방지).
 */
const OwnerDashboardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState<SelectableStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [today, setToday] = useState<TodayStats | null>(null);
    const [monthly, setMonthly] = useState<MonthPayroll | null>(null);

    const load = useCallback(async () => {
        try {
            const storesRes = await api.get<any[]>(`/api/stores/master/current`);
            const storeList: SelectableStore[] = ((storesRes.data as any[]) ?? []).map(s => ({
                id: s.id,
                storeName: s.storeName,
            }));
            setStores(storeList);
            const activeId = selectedStoreId ?? storeList[0]?.id ?? null;
            if (selectedStoreId == null) setSelectedStoreId(activeId);
            const firstStore = storeList.find(s => s.id === activeId);
            if (!firstStore?.id) {
                setToday(null);
                return;
            }
            const todayRes = await api.get<TodayStats>(
                `/api/store-queries/${firstStore.id}/stats/today`,
            ).catch(() => null);
            const monthlyRes = await api.get<MonthPayroll>(
                `/api/store-queries/${firstStore.id}/stats/payroll/month-to-date`,
            ).catch(() => null);

            setToday(
                todayRes?.data ?? {
                    storeId: firstStore.id,
                    storeName: firstStore.storeName ?? '내 매장',
                    checkedInCount: 0,
                    totalActiveEmployees: 0,
                    pendingEmployees: [],
                },
            );
            setMonthly(
                monthlyRes?.data ?? {
                    totalGross: 0,
                    totalNet: 0,
                    totalWorkingHours: 0,
                    daysRemainingInMonth: daysLeftInMonth(),
                },
            );
        } catch (e) {
            console.warn('[OwnerDashboard] load failed', e);
        }
    }, [selectedStoreId]);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* 다매장 셀렉터 (매장 2개 이상일 때만 자동 표시) */}
                <StoreSelector
                    stores={stores}
                    selectedId={selectedStoreId}
                    onSelect={setSelectedStoreId}
                />

                {/* Greeting */}
                <LinearGradient
                    colors={tokens.gradient.brand}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.greetingBox}
                >
                    <Text style={styles.greetingHello}>안녕하세요</Text>
                    <Text style={styles.greetingName}>
                        {user?.name ?? '사장님'} 님 👋
                    </Text>
                    <Text style={styles.greetingStore}>
                        {today?.storeName ?? '매장 정보 불러오는 중…'}
                    </Text>
                </LinearGradient>

                {/* 오늘 출근 카드 */}
                <Card style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>오늘 출근 현황</Text>
                        <Badge
                            text={`${today?.checkedInCount ?? 0}/${today?.totalActiveEmployees ?? 0}명`}
                            type={
                                today && today.checkedInCount === today.totalActiveEmployees
                                    ? 'success'
                                    : 'warning'
                            }
                        />
                    </View>
                    {today && today.pendingEmployees.length > 0 ? (
                        <View style={styles.pendingList}>
                            {today.pendingEmployees.map(name => (
                                <View key={name} style={styles.pendingRow}>
                                    <View style={styles.pendingDot} />
                                    <Text style={styles.pendingName}>{name}</Text>
                                    <Text style={styles.pendingLabel}>미출근</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.allCheckedIn}>모든 직원이 출근했어요 ✅</Text>
                    )}
                </Card>

                {/* 이번 달 급여 카드 */}
                <Card style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>이번 달 누적 급여</Text>
                        <Text style={styles.dayLeft}>
                            {monthly?.daysRemainingInMonth ?? 0}일 남음
                        </Text>
                    </View>
                    <Text style={styles.salaryAmount}>
                        ₩{(monthly?.totalGross ?? 0).toLocaleString('ko-KR')}
                    </Text>
                    <Text style={styles.salarySub}>
                        총 근무시간 {(monthly?.totalWorkingHours ?? 0).toFixed(1)}h ·
                        실수령 예상 ₩{(monthly?.totalNet ?? 0).toLocaleString('ko-KR')}
                    </Text>
                </Card>

                {/* 액션 퀵 그리드 */}
                <View style={styles.actionGrid}>
                    <ActionTile
                        title="급여 정산하기"
                        emoji="💰"
                        onPress={() => navigation.navigate('SalaryList')}
                    />
                    <ActionTile
                        title="직원 추가"
                        emoji="🧑‍🤝‍🧑"
                        onPress={() => navigation.navigate('StoreDetail')}
                    />
                    <ActionTile
                        title="위치/반경 설정"
                        emoji="📍"
                        onPress={() => navigation.navigate('StoreRegistraion')}
                    />
                    <ActionTile
                        title="노무·세무 팁"
                        emoji="📘"
                        onPress={() => navigation.navigate('InfoList')}
                    />
                </View>

                {/* 인사이트 (Phase 2 prepared) */}
                <Card style={styles.section} bordered>
                    <Text style={styles.insightTitle}>💡 인사이트</Text>
                    <Text style={styles.insightBody}>
                        이번 달 야간 근무가 지난달 대비 늘었어요. 직원 컨디션 확인해 보세요.
                    </Text>
                </Card>

                <Button
                    title="더 보기"
                    onPress={() => navigation.navigate('Settings')}
                    variant="ghost"
                    fullWidth
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const ActionTile: React.FC<{title: string; emoji: string; onPress: () => void}> = ({
    title,
    emoji,
    onPress,
}) => (
    <Card onPress={onPress} style={styles.actionTile} elevation={2} bordered>
        <Text style={styles.actionEmoji}>{emoji}</Text>
        <Text style={styles.actionTitle}>{title}</Text>
    </Card>
);

function daysLeftInMonth(): number {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, last - now.getDate());
}

const styles = StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: tokens.colors.background},
    scrollContent: {
        padding: tokens.spacing.lg,
        paddingBottom: tokens.spacing.huge,
        gap: tokens.spacing.md,
    },
    greetingBox: {
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xxl,
        marginBottom: tokens.spacing.sm,
    },
    greetingHello: {
        color: tokens.colors.textInverse,
        opacity: 0.85,
        fontSize: tokens.typography.sizes.md,
    },
    greetingName: {
        color: tokens.colors.textInverse,
        fontSize: tokens.typography.sizes.display,
        fontWeight: tokens.typography.weights.bold,
        letterSpacing: -1,
        marginTop: 4,
    },
    greetingStore: {
        color: tokens.colors.textInverse,
        opacity: 0.9,
        fontSize: tokens.typography.sizes.sm,
        marginTop: tokens.spacing.sm,
    },
    section: {marginVertical: 0},
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: tokens.spacing.md,
    },
    sectionTitle: {
        fontSize: tokens.typography.sizes.lg,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.textPrimary,
        letterSpacing: -0.3,
    },
    dayLeft: {
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.sm,
    },
    pendingList: {gap: tokens.spacing.sm},
    pendingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.spacing.sm,
    },
    pendingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: tokens.colors.warning,
    },
    pendingName: {
        flex: 1,
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.sizes.md,
    },
    pendingLabel: {
        color: tokens.colors.warning,
        fontSize: tokens.typography.sizes.sm,
        fontWeight: tokens.typography.weights.semibold,
    },
    allCheckedIn: {
        color: tokens.colors.success,
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
    },
    salaryAmount: {
        fontSize: 36,
        fontWeight: tokens.typography.weights.bold,
        color: tokens.colors.brandPrimary,
        letterSpacing: -1,
        marginVertical: tokens.spacing.xs,
    },
    salarySub: {
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.sm,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.spacing.sm,
    },
    actionTile: {
        flexBasis: '48%',
        alignItems: 'flex-start',
    },
    actionEmoji: {fontSize: 28, marginBottom: tokens.spacing.xs},
    actionTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textPrimary,
    },
    insightTitle: {
        fontSize: tokens.typography.sizes.md,
        fontWeight: tokens.typography.weights.semibold,
        color: tokens.colors.textPrimary,
        marginBottom: tokens.spacing.xs,
    },
    insightBody: {
        color: tokens.colors.textSecondary,
        fontSize: tokens.typography.sizes.sm,
        lineHeight: 20,
    },
});

export default OwnerDashboardScreen;
