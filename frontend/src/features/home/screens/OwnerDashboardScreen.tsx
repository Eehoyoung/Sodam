import React, {useCallback, useEffect, useState} from 'react';
import {RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppListItem,
    AppText,
    EmptyState,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {layout, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/utils/format';
import StoreSelector, {SelectableStore} from '../../../common/components/store/StoreSelector';
import {useAuth} from '../../../contexts/AuthContext';
import {useResponsive} from '../../../common/hooks/useResponsive';
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
 * 08/10 OwnerHome / Dashboard — 확정 시안.
 * navy HeroCard(오늘 처리할 일) + 지표 + 급여 요약. load/StoreSelector/네비게이션 보존.
 */
const OwnerDashboardScreen: React.FC = () => {
    const navigation = useNavigation<any>();
    const {user} = useAuth();
    const r = useResponsive();
    const c = useThemeColors();
    // compact(<360): 화면 폭이 좁아 카드 사이 여백을 한 단계 줄여 hero·지표·MoneyCard 가 한 뷰에 안정적으로 들어오게 한다.
    const contentGap = r.pick({compact: spacing.sm, default: spacing.md});
    const heroSubMargin = r.pick({compact: 2, default: spacing.xs});
    const tileBasis = r.pick<'47%' | '100%'>({compact: '100%', default: '47%'});
    const tileEmojiSize = r.pick({compact: 24, default: 28});
    const [refreshing, setRefreshing] = useState(false);
    const [stores, setStores] = useState<SelectableStore[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
    const [today, setToday] = useState<TodayStats | null>(null);
    const [monthly, setMonthly] = useState<MonthPayroll | null>(null);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        try {
            const storesRes = await api.get<any[]>(`/api/stores/master/current`);
            const storeList: SelectableStore[] = ((storesRes.data as any[]) ?? []).map(s => ({
                id: s.id,
                storeName: s.storeName,
            }));
            setStores(storeList);
            setLoaded(true);
            const activeId = selectedStoreId ?? storeList[0]?.id ?? null;
            if (selectedStoreId == null) {
                setSelectedStoreId(activeId);
            }
            const firstStore = storeList.find(s => s.id === activeId);
            if (!firstStore?.id) {
                setToday(null);
                return;
            }
            const todayRes = await api.get<TodayStats>(`/api/store-queries/${firstStore.id}/stats/today`).catch(() => null);
            const monthlyRes = await api.get<MonthPayroll>(`/api/store-queries/${firstStore.id}/stats/payroll/month-to-date`).catch(() => null);

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

    const pending = today?.pendingEmployees ?? [];
    const allIn = today ? today.checkedInCount === today.totalActiveEmployees : false;

    // A6 콜드스타트 — 매장 0개 사장 첫 진입
    if (loaded && stores.length === 0) {
        return (
            <ScreenContainer header={<AppHeader title="소담" />}>
                <EmptyState
                    glyph="🏪"
                    title="첫 매장을 등록해 볼까요?"
                    description="매장을 등록하면 직원 초대와 출퇴근, 급여 정산을 바로 시작할 수 있어요."
                    primary={{label: '매장 등록하기', onPress: () => navigation.navigate('StoreRegistraion')}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer padded={false} header={<AppHeader title={today?.storeName ?? '카페 소담'} actions={[{label: '알림', onPress: () => navigation.navigate('NotificationCenter')}]} />}>
            <ScrollView
                contentContainerStyle={[styles.content, {gap: contentGap}]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}>
                <StoreSelector stores={stores} selectedId={selectedStoreId} onSelect={setSelectedStoreId} />

                <AppCard variant="navy" hero>
                    <AppText variant="headingSm" tone="inverse">
                        {pending.length > 0 ? `오늘 처리할 일 ${pending.length}건` : '오늘 처리할 일이 없어요'}
                    </AppText>
                    <AppText variant="bodyMd" tone="inverse" style={[styles.heroSub, {marginTop: heroSubMargin}]}>
                        {user?.name ?? '사장님'}님, 출근 {today?.checkedInCount ?? 0}/{today?.totalActiveEmployees ?? 0}명 · 정산까지 {monthly?.daysRemainingInMonth ?? 0}일
                    </AppText>
                    <AppButton label="이상 출퇴근 확인" variant="secondary" onPress={() => navigation.navigate('MissingAttendanceCenter')} style={styles.heroCta} />
                </AppCard>

                <View style={styles.cols}>
                    <Metric label="출근" value={`${today?.checkedInCount ?? 0}/${today?.totalActiveEmployees ?? 0}`} tone={allIn ? c.success : c.warning} />
                    <Metric label="예상급여" value={shortMoney(monthly?.totalGross ?? 0)} tone={c.brandPrimary} />
                    <Metric label="남은일" value={`${monthly?.daysRemainingInMonth ?? 0}일`} tone={c.info} />
                </View>

                <AppCard variant="flat">
                    <AppText variant="titleMd" style={styles.sectionTitle}>오늘 출근 현황</AppText>
                    {pending.length > 0 ? (
                        pending.map(name => (
                            <AppListItem key={name} title={name} subtitle="아직 출근 기록 없음" right={<AppBadge label="알림" tone="warning" />} />
                        ))
                    ) : (
                        <AppText variant="bodyMd" tone="success">모든 직원이 출근했어요 ✅</AppText>
                    )}
                </AppCard>

                <MoneyCard
                    label="이번 달 누적 급여"
                    value={formatMoney(monthly?.totalGross ?? 0)}
                    sub={`총 근무시간 ${(monthly?.totalWorkingHours ?? 0).toFixed(1)}h · 실수령 예상 ${formatMoney(monthly?.totalNet ?? 0)}`}
                />

                <View style={styles.grid}>
                    <ActionTile title="급여 정산하기" emoji="💰" basis={tileBasis} emojiSize={tileEmojiSize} onPress={() => navigation.navigate('SalaryList')} />
                    <ActionTile title="직원 추가" emoji="🧑‍🤝‍🧑" basis={tileBasis} emojiSize={tileEmojiSize} onPress={() => navigation.navigate('StoreDetail')} />
                    <ActionTile title="위치/반경 설정" emoji="📍" basis={tileBasis} emojiSize={tileEmojiSize} onPress={() => navigation.navigate('StoreRegistraion')} />
                    <ActionTile title="노무·세무 팁" emoji="📘" basis={tileBasis} emojiSize={tileEmojiSize} onPress={() => navigation.navigate('InfoList')} />
                </View>

                <AppCard variant="warm">
                    <AppText variant="titleMd">💡 인사이트</AppText>
                    <AppText variant="caption" tone="secondary" style={styles.insightBody}>
                        이번 달 야간 근무가 지난달 대비 늘었어요. 정산 전 연장/야간 수당을 확인하세요.
                    </AppText>
                </AppCard>

                <AppButton label="더 보기" variant="ghost" onPress={() => navigation.navigate('Settings')} />
            </ScrollView>
        </ScreenContainer>
    );
};

const Metric: React.FC<{label: string; value: string; tone: string}> = ({label, value, tone}) => (
    <AppCard variant="flat" style={styles.metric}>
        <AppText variant="caption" tone="secondary">{label}</AppText>
        <AppText variant="headingSm" style={{color: tone}}>{value}</AppText>
    </AppCard>
);

const ActionTile: React.FC<{title: string; emoji: string; onPress: () => void; basis?: '47%' | '100%'; emojiSize?: number}> = ({
    title,
    emoji,
    onPress,
    basis = '47%',
    emojiSize = 28,
}) => (
    <AppCard variant="flat" onPress={onPress} style={[styles.tile, {flexBasis: basis}]}>
        <AppText style={[styles.tileEmoji, {fontSize: emojiSize}]}>{emoji}</AppText>
        <AppText variant="titleMd">{title}</AppText>
    </AppCard>
);

function daysLeftInMonth(): number {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(0, last - now.getDate());
}
function shortMoney(won: number): string {
    if (won >= 10000) {
        return `${Math.floor(won / 10000)}만`;
    }
    return won.toLocaleString('ko-KR');
}

const styles = StyleSheet.create({
    content: {paddingHorizontal: layout.screenPaddingHorizontal, paddingTop: spacing.md, paddingBottom: spacing.xl},
    heroSub: {marginTop: spacing.xs, opacity: 0.85},
    heroCta: {marginTop: spacing.md},
    cols: {flexDirection: 'row', gap: spacing.sm},
    metric: {flex: 1, alignItems: 'flex-start'},
    sectionTitle: {marginBottom: spacing.sm},
    grid: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
    tile: {flexGrow: 1, alignItems: 'flex-start'},
    tileEmoji: {marginBottom: spacing.xs},
    insightBody: {marginTop: spacing.xs, lineHeight: 20},
});

export default OwnerDashboardScreen;
