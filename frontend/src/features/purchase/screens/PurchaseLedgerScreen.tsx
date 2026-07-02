/**
 * ③ PurchaseLedgerScreen — 이번 달 매입 합계 히어로 + 분류 필터 + 매입 카드 리스트.
 *
 * 항목 탭 → 상세(Confirm 수정). 하단 CTA "가격 비교 보기". 빈 상태 EmptyState.
 * 우상단 액션으로 매입 추가(Scan 이동).
 */
import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
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
    HeroNumber,
    LoadingState,
    SegmentedControl,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
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

const monthRange = (): {from: string; to: string} => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, '0');
    const last = new Date(y, m + 1, 0).getDate();
    return {from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}`};
};

export default function PurchaseLedgerScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [items, setItems] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterIndex, setFilterIndex] = useState(0);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const {from, to} = monthRange();
            const data = await purchaseService.list(storeId, {from, to});
            setItems(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '매입 내역을 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const selectedCategory: PurchaseCategory | null =
        filterIndex === 0 ? null : PURCHASE_CATEGORY_ORDER[filterIndex - 1];

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

    if (loading) {
        return (
            <ScreenContainer header={header}>
                <LoadingState title="매입 내역 로딩 중" description="이번 달 매입을 불러오고 있어요" />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
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
                <EmptyState
                    title="아직 매입 기록이 없어요"
                    description="영수증을 찍거나 직접 입력해 첫 매입을 기록해 보세요."
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
                </CtaStack>
            }>
            <HeroNumber
                label="이번 달 매입 합계"
                value={`${monthTotal.toLocaleString()}원`}
                sub="이번 달 들어온 매입을 모았어요"
            />

            <View style={styles.filter}>
                <SegmentedControl
                    options={FILTER_OPTIONS.slice(0, 4)}
                    value={filterIndex < 4 ? filterIndex : 0}
                    onChange={setFilterIndex}
                />
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
                            <View style={styles.cardRow}>
                                <View style={styles.cardLeft}>
                                    <AppText variant="titleMd" numberOfLines={1}>
                                        {p.vendorName}
                                    </AppText>
                                    <AppText
                                        variant="caption"
                                        tone="tertiary"
                                        numberOfLines={1}
                                        style={styles.cardSub}>
                                        {p.purchaseDate} · {p.categoryLabel}
                                    </AppText>
                                </View>
                                <View style={styles.cardRight}>
                                    <AppText variant="titleMd" weight="800" numberOfLines={1}>
                                        {p.totalAmount.toLocaleString()}원
                                    </AppText>
                                    {p.status === 'DRAFT' ? (
                                        <AppBadge label="임시" tone="warning" style={styles.badge} />
                                    ) : null}
                                </View>
                            </View>
                        </AppCard>
                    ))
                )}
            </View>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    filter: {marginTop: spacing.xxl},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    cardRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    cardLeft: {flex: 1, minWidth: 0},
    cardSub: {marginTop: spacing.xs},
    cardRight: {flexShrink: 0, alignItems: 'flex-end', maxWidth: '45%'},
    badge: {marginTop: spacing.xs},
});
