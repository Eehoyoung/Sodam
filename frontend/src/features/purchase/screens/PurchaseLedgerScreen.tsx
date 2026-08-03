/**
 * B1 PurchaseLedgerScreen — v3 시안(sodam-v3-10-business.html) 1:1 + 월 내비게이션(WP-05).
 *
 * 월 내비게이션 바(‹ YYYY년 M월 ›) + MoneyCard(해당 월 매입 합계) + 분류 FilterChipRow(7종 전체 노출) +
 * 매입 카드 리스트(상단 행: 거래처명+임시배지, 메타: 일자·분류, 하단 우측정렬: 합계금액).
 * 항목 탭 → 상세(Confirm 수정). 하단 CTA "가격 비교 보기". 빈 상태 EmptyState. 우상단 액션으로 매입 추가(Scan 이동).
 *
 * v3 시안은 4칸 SegmentedControl이었으나, 스크롤 불가 고정폭 컴포넌트로 8개 옵션(전체+7분류) 중
 * 4개만 노출되던 결함이 있어 FilterChipRow(줄바꿈 가능)로 교체했다 — 주류·음료·소모품·기타 분류
 * 필터링 복구(2026-08-03 갭수정 계획 WP-01).
 *
 * 원래 이번 달로 하드코딩돼 지난달 매입을 볼 방법이 없었다 — EmployeeWorkLogScreen의 월 내비게이션
 * 패턴(‹ chevron-back / chevron-forward ›)을 그대로 따라 기간 선택을 복구했다(WP-05).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp, useFocusEffect} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    CtaStack,
    EmptyState,
    ErrorState,
    FilterChipRow,
    LoadingState,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {
    PURCHASE_CATEGORY_LABELS,
    PURCHASE_CATEGORY_ORDER,
    Purchase,
    PurchaseCategory,
} from '../types';

type LedgerRouteProp = RouteProp<{PurchaseLedger: {storeId: number}}, 'PurchaseLedger'>;

interface Props {
    route: LedgerRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

// 0 = 전체, 그 외는 PURCHASE_CATEGORY_ORDER 인덱스+1
const FILTER_OPTIONS = ['전체', ...PURCHASE_CATEGORY_ORDER.map(k => PURCHASE_CATEGORY_LABELS[k])];

const pad = (n: number) => String(n).padStart(2, '0');

const monthRange = (year: number, month: number): {from: string; to: string} => {
    const last = new Date(year, month, 0).getDate();
    return {from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}`};
};

export default function PurchaseLedgerScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [items, setItems] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterIndex, setFilterIndex] = useState(0);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const {from, to} = monthRange(year, month);
            const data = await purchaseService.list(storeId, {from, to});
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '매입 내역을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId, year, month]);

    const moveMonth = (amount: number) => {
        const next = new Date(year, month - 1 + amount, 1);
        setYear(next.getFullYear());
        setMonth(next.getMonth() + 1);
    };

    // useFocusEffect는 화면이 포커스를 얻을 때만 재실행되고, 포커스가 유지된 채 year/month가
    // 바뀌는 월 이동 탭에는 반응하지 않는다 — 그래서 별도 useEffect로 월 변경 시 재조회한다.
    useEffect(() => {
        load();
    }, [load]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const selectedCategory: PurchaseCategory | null =
        filterIndex <= 0 ? null : PURCHASE_CATEGORY_ORDER[filterIndex - 1];

    const filtered = useMemo(
        () => (selectedCategory ? items.filter(p => p.category === selectedCategory) : items),
        [items, selectedCategory],
    );

    const monthTotal = useMemo(
        () => items.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0),
        [items],
    );

    const header = (
        <AppHeader
            title="매입장부"
            onBack={() => navigation.goBack()}
            actions={[
                {
                    accessibilityLabel: '발주 참고',
                    icon: <Ionicons name="repeat-outline" size={20} color={c.brandPrimary} />,
                    onPress: () => navigation.navigate('ReorderHint', {storeId}),
                },
                {
                    accessibilityLabel: '매입 추가',
                    icon: <Ionicons name="add" size={22} color={c.brandPrimary} />,
                    onPress: () => navigation.navigate('PurchaseScan', {storeId}),
                },
            ]}
        />
    );

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    // 모든 상태(로딩·에러·빈 목록)에서 노출 — 빈 달에 갇혀 이전 달로 못 돌아가는 일이 없도록.
    const monthNav = (
        <View style={[styles.monthBar, {backgroundColor: c.surface, borderColor: c.border}]}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 달"
                onPress={() => moveMonth(-1)}
                hitSlop={10}
                style={[styles.monthButton, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="chevron-back" size={22} color={c.brandPrimary} />
            </Pressable>
            <View style={styles.monthTitleWrap}>
                <AppText variant="headingMd" weight="800" center>
                    {year}년 {month}월
                </AppText>
            </View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 달"
                onPress={() => moveMonth(1)}
                hitSlop={10}
                style={[styles.monthButton, {backgroundColor: c.surfaceMuted}]}>
                <Ionicons name="chevron-forward" size={22} color={c.brandPrimary} />
            </Pressable>
        </View>
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                {monthNav}
                <LoadingState title="매입 내역 로딩 중" description={`${year}년 ${month}월 매입을 불러오고 있어요`} />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                {monthNav}
                <ErrorState
                    title="불러오지 못했어요"
                    description={error}
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    if (items.length === 0) {
        return (
            <ScreenContainer header={header}>
                {monthNav}
                <EmptyState
                    title="이 달엔 매입 기록이 없어요"
                    description={
                        isCurrentMonth
                            ? '영수증을 찍거나 직접 입력해 첫 매입을 기록해 보세요.'
                            : '다른 달을 확인하거나 이 달의 매입을 새로 기록해 보세요.'
                    }
                    glyph={<Ionicons name="receipt-outline" size={26} color={c.textInverse} />}
                    primary={{
                        label: '매입 추가하기',
                        onPress: () => navigation.navigate('PurchaseScan', {storeId}),
                    }}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer
            scroll
            header={header}
            footer={
                <CtaStack>
                    <AppButton
                        label="가격 비교 보기"
                        onPress={() => navigation.navigate('PriceTrend', {storeId})}
                        leftIcon={<Ionicons name="trending-up-outline" size={20} color={c.textInverse} />}
                    />
                    <AppButton
                        label="매입 분석 보기"
                        variant="secondary"
                        onPress={() => navigation.navigate('PurchaseInsight', {storeId})}
                        leftIcon={<Ionicons name="pie-chart-outline" size={20} color={c.brandPrimary} />}
                    />
                </CtaStack>
            }>
            {monthNav}

            <MoneyCard
                label={`${year}년 ${month}월 매입 합계`}
                value={`${monthTotal.toLocaleString()}원`}
                sub={isCurrentMonth ? '이번 달 들어온 매입을 모았어요' : '해당 월 매입을 모았어요'}
            />

            <View style={styles.filter}>
                <FilterChipRow options={FILTER_OPTIONS} value={filterIndex} onChange={setFilterIndex} />
            </View>

            <View style={styles.list}>
                {filtered.length === 0 ? (
                    <AppCard variant="plain">
                        <AppText variant="bodyMd" tone="secondary" center>
                            이 분류의 매입이 아직 없어요.
                        </AppText>
                    </AppCard>
                ) : (
                    filtered.map(p => (
                        <AppCard
                            key={p.id}
                            variant="flat"
                            onPress={() =>
                                navigation.navigate('PurchaseConfirm', {storeId, purchaseId: p.id})
                            }
                            accessibilityLabel={`${p.vendorName} ${p.totalAmount.toLocaleString()}원`}>
                            <View style={styles.cardTop}>
                                <AppText variant="titleMd" numberOfLines={1} style={styles.cardTitle}>
                                    {p.vendorName}
                                </AppText>
                                {p.imageRef ? (
                                    <Ionicons name="receipt-outline" size={14} color={c.textTertiary} />
                                ) : null}
                                {p.status === 'DRAFT' ? <AppBadge label="임시" tone="warning" /> : null}
                            </View>
                            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                {p.purchaseDate} · {p.categoryLabel}
                            </AppText>
                            <View style={styles.cardValueRow}>
                                <AppText variant="titleMd" weight="800" numberOfLines={1}>
                                    {p.totalAmount.toLocaleString()}원
                                </AppText>
                            </View>
                        </AppCard>
                    ))
                )}
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    monthBar: {
        minHeight: 64,
        borderWidth: 1,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    monthButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitleWrap: {flex: 1, paddingHorizontal: spacing.md},
    filter: {marginTop: spacing.xxl},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    cardTitle: {flex: 1, minWidth: 0},
    cardValueRow: {marginTop: spacing.xs, flexDirection: 'row', justifyContent: 'flex-end'},
});
