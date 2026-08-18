/**
 * B6 PurchaseInsightScreen — 매입 분석(WP-05 고도화, 시안 없음 · WP-06에서 sodam-v3-10-business.html 갱신 예정).
 *
 * 이번 달 거래처별 매입 비중(어디에 제일 많이 썼나) + 최근 6개월 매입 추이(막대, 외부 차트 라이브러리
 * 금지 — PriceTrendScreen 패턴 재사용). 신규 API·집계 없이 이미 저장 중인 매입 데이터만 재구성한다.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp, useFocusEffect} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {MonthlySummary, VendorSummary} from '../types';

type InsightRouteProp = RouteProp<{PurchaseInsight: {storeId: number}}, 'PurchaseInsight'>;

interface Props {
    route: InsightRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

const monthRange = (): {from: string; to: string} => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const last = new Date(y, m + 1, 0).getDate();
    return {from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}`};
};

export default function PurchaseInsightScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [vendors, setVendors] = useState<VendorSummary[]>([]);
    const [months, setMonths] = useState<MonthlySummary[]>([]);
    const [comment, setComment] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const {from, to} = monthRange();
            const [vendorData, monthlyData] = await Promise.all([
                purchaseService.vendorSummary(storeId, {from, to}),
                purchaseService.monthlySummary(storeId, 6),
            ]);
            setVendors(vendorData);
            setMonths(monthlyData);
            // 코멘트는 최선노력(best-effort) — 실패해도 핵심 데이터(거래처·월별) 화면은 그대로 유지한다(HC-7).
            try {
                const insight = await purchaseService.insightComment(storeId, {from, to, months: 6});
                setComment(insight.comment);
            } catch {
                setComment(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '매입 분석을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const maxMonthly = useMemo(
        () => (months.length > 0 ? Math.max(...months.map(m => m.totalAmount)) : 0),
        [months],
    );

    const header = <AppHeader title="매입 분석" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="매입 분석 로딩 중" description="거래처별 비중과 월별 추이를 모으고 있어요" />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                <ErrorState title="불러오지 못했어요" description={error} primary={{label: '다시 시도', onPress: load}} />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            {comment ? (
                <AppCard variant="spot" style={styles.commentCard} testID="purchase-insight-comment">
                    <AppText variant="bodyMd">{comment}</AppText>
                </AppCard>
            ) : null}

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                월별 매입 추이
            </AppText>
            {months.length === 0 ? (
                <AppCard variant="plain">
                    <AppText variant="bodyMd" tone="secondary" center>
                        아직 매입 기록이 없어요.
                    </AppText>
                </AppCard>
            ) : (
                <AppCard variant="plain">
                    <View style={styles.bars}>
                        {months.map(m => {
                            const ratio = maxMonthly > 0 ? m.totalAmount / maxMonthly : 0;
                            return (
                                <View key={m.yearMonth} style={styles.barRow}>
                                    <AppText variant="caption" tone="tertiary" numberOfLines={1} style={styles.barLabel}>
                                        {m.yearMonth.slice(5)}월
                                    </AppText>
                                    <View style={[styles.barTrack, {backgroundColor: c.surfaceMuted}]}>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {width: `${Math.max(4, ratio * 100)}%`, backgroundColor: c.brandPrimary},
                                            ]}
                                        />
                                    </View>
                                    <AppText variant="caption" weight="700" numberOfLines={1} style={styles.barValue}>
                                        {m.totalAmount.toLocaleString()}
                                    </AppText>
                                </View>
                            );
                        })}
                    </View>
                </AppCard>
            )}

            <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                이번 달 거래처별 비중
            </AppText>
            {vendors.length === 0 ? (
                <EmptyState
                    title="이번 달 매입이 없어요"
                    description="매입을 기록하면 거래처별 비중을 볼 수 있어요."
                    glyph={<Ionicons name="pie-chart-outline" size={26} color={c.textInverse} />}
                />
            ) : (
                <View style={styles.list}>
                    {vendors.map(v => (
                        <AppCard key={v.vendorName} variant="flat">
                            <View style={styles.vendorTop}>
                                <AppText variant="titleMd" numberOfLines={1} style={styles.vendorName}>
                                    {v.vendorName}
                                </AppText>
                                <AppText variant="bodyMd" weight="800" tone="brand">
                                    {v.sharePercent.toFixed(1)}%
                                </AppText>
                            </View>
                            <View style={[styles.shareTrack, {backgroundColor: c.surfaceMuted}]}>
                                <View
                                    style={[
                                        styles.shareFill,
                                        {width: `${Math.max(2, v.sharePercent)}%`, backgroundColor: c.brandPrimary},
                                    ]}
                                />
                            </View>
                            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                {v.totalAmount.toLocaleString()}원 · {v.purchaseCount}건
                            </AppText>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    commentCard: {marginTop: spacing.md},
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.md},
    bars: {gap: spacing.md},
    barRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    barLabel: {width: 40},
    barTrack: {flex: 1, height: 10, borderRadius: radius.pill, overflow: 'hidden'},
    barFill: {height: 10, borderRadius: radius.pill},
    barValue: {width: 72, textAlign: 'right'},
    list: {gap: spacing.sm},
    vendorTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    vendorName: {flex: 1, minWidth: 0},
    shareTrack: {height: 8, borderRadius: radius.pill, overflow: 'hidden', marginBottom: spacing.sm},
    shareFill: {height: 8, borderRadius: radius.pill},
});
