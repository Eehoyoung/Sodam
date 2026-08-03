/**
 * B5 ReorderHintScreen — v3 시안(sodam-v3-10-business.html) 1:1.
 *
 * info-card 면책("참고용이에요 — 재고 자동 차감은 하지 않아요") + section-label "자주 사는 품목" +
 * 보조 info-card(30일 안내) + 리스트(상단 행: 품목명+평균주기 배지, 메타 한 줄: 마지막일자·수량·매입횟수).
 * (재고관리 아님 — POS Non-Goal 경계를 사용자에게 명시)
 *
 * 카드 탭 → 그 품목의 가격 추이(PriceTrend)로 즉시 이동(WP-05) — 이전엔 PriceTrend의
 * route.params.item을 아무도 넘기지 않는 죽은 배선이었다.
 */
import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {RouteProp, NavigationProp, useFocusEffect} from '@react-navigation/native';
import {
    AppBadge,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import purchaseService from '../services/purchaseService';
import {ReorderHint} from '../types';

type ReorderRouteProp = RouteProp<{ReorderHint: {storeId: number}}, 'ReorderHint'>;

interface Props {
    route: ReorderRouteProp;
    navigation: NavigationProp<Record<string, object | undefined>>;
}

export default function ReorderHintScreen({route, navigation}: Props) {
    const {storeId} = route.params;
    const c = useThemeColors();
    const [hints, setHints] = useState<ReorderHint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await purchaseService.reorder(storeId, 30);
            setHints(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '발주 참고 정보를 불러오지 못했어요.');
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load]),
    );

    const header = <AppHeader title="발주 참고" onBack={() => navigation.goBack()} />;

    // 스코프 라인 면책 — 모든 상태에서 노출되도록 컴포넌트로 분리.
    const disclaimer = (
        <AppCard variant="flat" style={styles.notice}>
            <AppText variant="bodyMd" tone="secondary">
                참고용이에요 — 재고 자동 차감은 하지 않아요.
            </AppText>
        </AppCard>
    );

    if (loading) {
        return (
            <ScreenContainer header={header}>
                {disclaimer}
                <LoadingState title="발주 참고 로딩 중" description="자주 사는 품목을 모으고 있어요" />
            </ScreenContainer>
        );
    }

    if (error) {
        return (
            <ScreenContainer header={header}>
                {disclaimer}
                <ErrorState
                    title="불러오지 못했어요"
                    description={error}
                    primary={{label: '다시 시도', onPress: load}}
                />
            </ScreenContainer>
        );
    }

    return (
        <ScreenContainer scroll header={header}>
            {disclaimer}

            <AppText variant="titleMd" tone="secondary" style={styles.title}>
                자주 사는 품목
            </AppText>
            <AppCard variant="flat" style={styles.subtitleCard}>
                <AppText variant="caption" tone="tertiary">
                    최근 30일 매입을 바탕으로 한 매입 주기예요.
                </AppText>
            </AppCard>

            {hints.length === 0 ? (
                <View style={styles.empty}>
                    <EmptyState
                        title="아직 매입 주기가 없어요"
                        description="같은 품목을 두 번 이상 매입하면 평균 주기를 알려드려요."
                        glyph={<Ionicons name="repeat-outline" size={26} color={c.textInverse} />}
                    />
                </View>
            ) : (
                <View style={styles.list}>
                    {hints.map((h, i) => (
                        <AppCard
                            key={`${h.itemName}-${i}`}
                            variant="flat"
                            onPress={() => navigation.navigate('PriceTrend', {storeId, item: h.itemName})}
                            accessibilityLabel={`${h.itemName} 가격 추이 보기`}>
                            <View style={styles.itemTop}>
                                <AppText variant="titleMd" numberOfLines={1} style={styles.itemName}>
                                    {h.itemName}
                                </AppText>
                                <AppBadge label={`평균 ${Math.round(h.avgIntervalDays)}일`} tone="success" />
                            </View>
                            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
                                마지막 {h.lastPurchaseDate} · {h.lastQuantity.toLocaleString()}
                                {h.unit ? h.unit : ''} · {h.purchaseCount}회 매입
                            </AppText>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    notice: {marginBottom: spacing.lg},
    title: {marginTop: spacing.xs},
    subtitleCard: {marginTop: spacing.sm, marginBottom: spacing.sm},
    empty: {marginTop: spacing.huge},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    itemTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    itemName: {flex: 1, minWidth: 0},
});
