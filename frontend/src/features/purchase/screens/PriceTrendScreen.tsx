/**
 * ④ PriceTrendScreen — 품목 입력/선택 → 단가 가격비교.
 *
 * 현재단가 히어로 + 지난번 대비 ±% + 단가 추이(간단 막대, 외부 차트 라이브러리 금지)
 * + 거래처별 최저가(☆) 표시.
 */
import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppInput,
    AppText,
    AppToast,
    EmptyState,
    HeroNumber,
    ScreenContainer,
} from '../../../common/components/ds';
import {radius, spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {PriceTrend} from '../types';

type PriceTrendRouteProp = RouteProp<{PriceTrend: {storeId: number; item?: string}}, 'PriceTrend'>;

interface Props {
    route: PriceTrendRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

export default function PriceTrendScreen({route, navigation}: Props) {
    const {storeId, item} = route.params;
    const c = useThemeColors();
    const [query, setQuery] = useState(item ?? '');
    const [trend, setTrend] = useState<PriceTrend | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const search = async () => {
        const q = query.trim();
        if (!q) {
            AppToast.warn('품목명을 입력해 주세요.');
            return;
        }
        setLoading(true);
        try {
            const data = await purchaseService.priceTrend(storeId, q);
            setTrend(data);
            setSearched(true);
        } catch {
            AppToast.error('가격 추이를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    };

    const header = <AppHeader title="가격 추이" onBack={() => navigation.goBack()} />;

    const changeText = (() => {
        if (trend?.changeRatePercent === undefined) {
            return null;
        }
        const up = trend.changeRatePercent >= 0;
        const sign = up ? '+' : '';
        return {
            up,
            text: `지난번 대비 ${sign}${trend.changeRatePercent.toFixed(1)}%`,
        };
    })();

    const maxPoint = trend && trend.points.length > 0
        ? Math.max(...trend.points.map(p => p.unitPrice))
        : 0;

    return (
        <ScreenContainer scroll header={header}>
            <AppInput
                label="품목"
                placeholder="예: 양파"
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                onSubmitEditing={search}
            />
            <AppButton
                label="가격 추이 보기"
                size="md"
                loading={loading}
                loadingLabel="불러오는 중..."
                onPress={search}
                style={styles.searchBtn}
                leftIcon={<Ionicons name="trending-up-outline" size={18} color={c.textInverse} />}
            />

            {!searched ? (
                <View style={styles.placeholder}>
                    <AppText variant="bodyMd" tone="secondary" center>
                        품목을 입력하면 거래처·시점별 단가를 비교해 드려요.
                    </AppText>
                </View>
            ) : !trend || trend.points.length === 0 ? (
                <View style={styles.placeholder}>
                    <EmptyState
                        title="비교할 단가가 없어요"
                        description="이 품목의 매입 기록이 아직 부족해요. 매입을 더 기록해 주세요."
                        glyph={<Ionicons name="bar-chart-outline" size={26} color={c.textInverse} />}
                    />
                </View>
            ) : (
                <>
                    <View style={styles.hero}>
                        <HeroNumber
                            label={`${trend.itemName} 현재 단가`}
                            value={`${trend.currentUnitPrice.toLocaleString()}원${trend.unit ? `/${trend.unit}` : ''}`}
                            accent
                        />
                        {changeText ? (
                            <View style={styles.changeRow}>
                                <Ionicons
                                    name={changeText.up ? 'arrow-up' : 'arrow-down'}
                                    size={16}
                                    color={changeText.up ? c.error : c.success}
                                />
                                <AppText
                                    variant="bodyMd"
                                    weight="700"
                                    tone={changeText.up ? 'error' : 'success'}
                                    style={styles.changeText}>
                                    {changeText.text}
                                </AppText>
                                {trend.previousUnitPrice !== undefined ? (
                                    <AppText variant="caption" tone="tertiary" style={styles.prevText}>
                                        ({trend.previousUnitPrice.toLocaleString()} → {trend.currentUnitPrice.toLocaleString()})
                                    </AppText>
                                ) : null}
                            </View>
                        ) : null}
                    </View>

                    <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                        단가 추이
                    </AppText>
                    <AppCard variant="plain">
                        <View style={styles.bars}>
                            {trend.points.map((p, i) => {
                                const ratio = maxPoint > 0 ? p.unitPrice / maxPoint : 0;
                                return (
                                    <View key={`${p.date}-${i}`} style={styles.barRow}>
                                        <AppText
                                            variant="caption"
                                            tone="tertiary"
                                            numberOfLines={1}
                                            style={styles.barDate}>
                                            {p.date}
                                        </AppText>
                                        <View style={[styles.barTrack, {backgroundColor: c.surfaceMuted}]}>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        width: `${Math.max(8, ratio * 100)}%`,
                                                        backgroundColor: c.brandPrimary,
                                                    },
                                                ]}
                                            />
                                        </View>
                                        <AppText
                                            variant="caption"
                                            weight="700"
                                            numberOfLines={1}
                                            style={styles.barValue}>
                                            {p.unitPrice.toLocaleString()}
                                        </AppText>
                                    </View>
                                );
                            })}
                        </View>
                    </AppCard>

                    <AppText variant="titleMd" tone="secondary" style={styles.sectionLabel}>
                        거래처별 단가
                    </AppText>
                    <AppCard variant="plain">
                        {dedupeVendors(trend).map((v, i, arr) => {
                            const isCheapest = trend.cheapestVendor === v.vendorName;
                            return (
                                <View
                                    key={v.vendorName}
                                    style={[
                                        styles.vendorRow,
                                        i < arr.length - 1 && styles.vendorRowBordered,
                                        i < arr.length - 1 && {borderBottomColor: c.divider},
                                    ]}>
                                    <View style={styles.vendorName}>
                                        {isCheapest ? (
                                            <Ionicons name="star" size={14} color={c.brandPrimary} />
                                        ) : (
                                            <Ionicons name="star-outline" size={14} color={c.textTertiary} />
                                        )}
                                        <AppText
                                            variant="bodyMd"
                                            weight={isCheapest ? '700' : '500'}
                                            numberOfLines={1}
                                            style={styles.vendorNameText}>
                                            {v.vendorName}
                                        </AppText>
                                        {isCheapest ? (
                                            <AppText variant="caption" tone="brand" weight="800" style={styles.cheapTag}>
                                                최저
                                            </AppText>
                                        ) : null}
                                    </View>
                                    <AppText variant="bodyMd" weight="700" numberOfLines={1}>
                                        {v.unitPrice.toLocaleString()}원
                                    </AppText>
                                </View>
                            );
                        })}
                    </AppCard>
                </>
            )}
        </ScreenContainer>
    );
}

/** 거래처별 최신 단가 1건만 (points 는 시점순일 수 있어 마지막 값 사용). */
function dedupeVendors(trend: PriceTrend): Array<{vendorName: string; unitPrice: number}> {
    const map = new Map<string, number>();
    trend.points.forEach(p => map.set(p.vendorName, p.unitPrice));
    return Array.from(map.entries()).map(([vendorName, unitPrice]) => ({vendorName, unitPrice}));
}

const styles = StyleSheet.create({
    searchBtn: {marginTop: spacing.md},
    placeholder: {marginTop: spacing.huge},
    hero: {marginTop: spacing.xxl},
    changeRow: {flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, flexWrap: 'wrap'},
    changeText: {marginLeft: spacing.xs},
    prevText: {marginLeft: spacing.sm},
    sectionLabel: {marginTop: spacing.xxl, marginBottom: spacing.md},
    bars: {gap: spacing.md},
    barRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    barDate: {width: 84},
    barTrack: {flex: 1, height: 10, borderRadius: radius.pill, overflow: 'hidden'},
    barFill: {height: 10, borderRadius: radius.pill},
    barValue: {width: 64, textAlign: 'right'},
    vendorRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        gap: spacing.md,
    },
    vendorRowBordered: {borderBottomWidth: 1},
    vendorName: {flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: spacing.xs},
    vendorNameText: {flexShrink: 1},
    cheapTag: {marginLeft: spacing.xs},
});
