/* eslint-disable react-native/no-color-literals -- 히어로 그라디언트 위 반투명 데코/디바이더 고정 색 */
import React, {useCallback, useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AmountText,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {gradient, radius, shadow, spacing} from '../../../theme/tokens';
import {
    CycleLaborRatio,
    DailyLaborRatio,
    fetchCycleLaborRatio,
    fetchDailyLaborRatios,
    resolveRatioPercent,
} from '../services/salesService';

type Route = RouteProp<{LaborCostRatio: {storeId: number}}, 'LaborCostRatio'>;

const DAILY_DAYS = 14;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function isoOf(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

function isoToLabel(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return `${m}월 ${d}일 (${WEEKDAYS[date.getDay()]})`;
}

/**
 * 인건비율 — 이번 정산기간 누적 인건비/매출 비율(히어로) + 최근 14일 일별 현황.
 * ratio 단위(소수/퍼센트)가 BE 에서 불확실해 resolveRatioPercent 로 FE 에서 직접 계산한다.
 * 매출 미입력 날은 "매출 입력" 버튼으로 DailySales 화면에 바로 진입.
 */
const LaborCostRatioScreen: React.FC = () => {
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [cycle, setCycle] = useState<CycleLaborRatio | null>(null);
    const [daily, setDaily] = useState<DailyLaborRatio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const today = new Date();
            const from = isoOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (DAILY_DAYS - 1)));
            const to = isoOf(today);
            const [cycleData, dailyData] = await Promise.all([
                fetchCycleLaborRatio(storeId),
                fetchDailyLaborRatios(storeId, from, to),
            ]);
            setCycle(cycleData);
            // 최신 날짜가 위로 오게 정렬
            setDaily([...dailyData].sort((a, b) => (a.date < b.date ? 1 : -1)));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const goSalesEntry = () => navigation.navigate('DailySales', {storeId});

    const cyclePct = cycle ? resolveRatioPercent(cycle.laborCost, cycle.sales, cycle.ratio) : null;
    const prevRatioRaw = cycle ? cycle.prevCycleRatio : null;
    const prevPct =
        prevRatioRaw !== null && prevRatioRaw !== undefined
            ? (prevRatioRaw <= 1 ? prevRatioRaw * 100 : prevRatioRaw)
            : null;
    const deltaPct = cyclePct !== null && prevPct !== null ? cyclePct - prevPct : null;

    const renderHero = () => {
        if (!cycle) {
            return null;
        }
        return (
            <LinearGradient
                colors={gradient.brandStrong}
                style={styles.heroCard}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}>
                <View style={styles.heroDecor} />
                <AppText variant="caption" tone="inverse" style={styles.heroLabel}>이번 정산기간 인건비율</AppText>
                {cyclePct !== null ? (
                    <AmountText size={36} tone="inverse">{cyclePct.toFixed(1)}%</AmountText>
                ) : (
                    <AppText variant="headingSm" tone="inverse">매출 입력이 필요해요</AppText>
                )}
                <AppText variant="caption" tone="inverse" style={styles.heroRange}>
                    {cycle.cycleStart} ~ {cycle.cycleEnd}
                </AppText>
                {deltaPct !== null && (
                    <View style={styles.heroDeltaRow}>
                        <Ionicons
                            name={deltaPct >= 0 ? 'arrow-up' : 'arrow-down'}
                            size={13}
                            color={c.textInverse}
                        />
                        <AppText variant="caption" tone="inverse" weight="700">
                            지난 주기 대비 {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%p
                        </AppText>
                    </View>
                )}
                <View style={styles.heroDivider} />
                <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                        <AppText variant="caption" tone="inverse" style={styles.heroStatLbl}>누적 인건비</AppText>
                        <AmountText size={18} tone="inverse">{cycle.laborCost.toLocaleString('ko-KR')}원</AmountText>
                    </View>
                    <View style={[styles.heroStat, styles.heroStatDivider]}>
                        <AppText variant="caption" tone="inverse" style={styles.heroStatLbl}>누적 매출</AppText>
                        <AmountText size={18} tone="inverse">
                            {cycle.sales !== null ? `${cycle.sales.toLocaleString('ko-KR')}원` : '미입력'}
                        </AmountText>
                    </View>
                </View>
            </LinearGradient>
        );
    };

    const renderDailyRow = (row: DailyLaborRatio) => {
        const pct = resolveRatioPercent(row.laborCost, row.sales, row.ratio);
        const barPct = pct !== null ? Math.max(0, Math.min(100, pct)) : 0;
        return (
            <AppCard key={row.date} variant="flat">
                <View style={styles.dayTop}>
                    <View style={styles.flex}>
                        <AppText variant="titleMd" numberOfLines={1}>{isoToLabel(row.date)}</AppText>
                        <AppText variant="caption" tone="tertiary">
                            인건비 {row.laborCost.toLocaleString('ko-KR')}원
                            {row.sales !== null ? ` · 매출 ${row.sales.toLocaleString('ko-KR')}원` : ''}
                        </AppText>
                    </View>
                    {pct !== null ? (
                        <AppText variant="titleMd" weight="700" style={{color: c.brandPrimary}}>
                            {pct.toFixed(1)}%
                        </AppText>
                    ) : (
                        <TouchableOpacity onPress={goSalesEntry} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                            <AppText variant="caption" weight="700" style={{color: c.brandPrimary}}>
                                매출 입력 →
                            </AppText>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.miniBar, {backgroundColor: c.divider}]}>
                    <View
                        style={[styles.miniBarFill, {
                            width: `${barPct}%` as const,
                            backgroundColor: c.brandPrimary,
                        }]}
                    />
                </View>
            </AppCard>
        );
    };

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="인건비율" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="인건비율을 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <>
                    {renderHero()}

                    <AppText variant="titleMd" style={styles.listTitle}>일별 현황</AppText>

                    {daily.length === 0 ? (
                        <EmptyState
                            glyph={<Ionicons name="stats-chart-outline" size={40} color={c.textTertiary} />}
                            markColor={c.surfaceMuted}
                            title="일별 데이터가 없어요"
                            description="매출을 입력하면 일별 인건비율을 보여드려요."
                            primary={{label: '매출 입력하기', onPress: goSalesEntry}}
                        />
                    ) : (
                        <View style={styles.list}>
                            {daily.map(renderDailyRow)}
                        </View>
                    )}
                </>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    heroCard: {
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadow.lg,
    },
    heroDecor: {
        position: 'absolute', top: -24, right: -24,
        width: 120, height: 120,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 60,
    },
    heroLabel: {opacity: 0.8, marginBottom: spacing.xs},
    heroRange: {opacity: 0.75, marginTop: spacing.xs},
    heroDeltaRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm},
    heroDivider: {height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: spacing.md},
    heroStats: {flexDirection: 'row'},
    heroStat: {flex: 1, alignItems: 'center', gap: 3},
    heroStatDivider: {borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)'},
    heroStatLbl: {opacity: 0.75},

    listTitle: {marginTop: spacing.xxl, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    dayTop: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm},
    flex: {flex: 1},
    miniBar: {height: 6, borderRadius: radius.pill, overflow: 'hidden'},
    miniBarFill: {height: '100%', borderRadius: radius.pill},
});

export default LaborCostRatioScreen;
