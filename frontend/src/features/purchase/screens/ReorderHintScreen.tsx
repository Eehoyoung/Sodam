/**
 * ⑤ ReorderHintScreen — 품목별 매입주기·마지막 매입(발주 참고).
 *
 * 스코프 라인 가시화: 상단에 "참고용 — 재고 자동 차감은 하지 않아요" 면책을 반드시 노출.
 * (재고관리 아님 — POS Non-Goal 경계를 사용자에게 명시)
 */
import React, {useCallback, useState} from 'react';
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
        <View style={[styles.notice, {backgroundColor: c.warningBg}]}>
            <Ionicons name="information-circle-outline" size={18} color={c.warning} />
            <AppText variant="caption" tone="secondary" style={styles.noticeText}>
                참고용이에요 — 재고 자동 차감은 하지 않아요.
            </AppText>
        </View>
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

            <AppText variant="headingSm" style={styles.title}>
                자주 사는 품목
            </AppText>
            <AppText variant="caption" tone="tertiary" style={styles.subtitle}>
                최근 30일 매입을 바탕으로 한 매입 주기예요.
            </AppText>

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
                        <AppCard key={`${h.itemName}-${i}`} variant="flat">
                            <View style={styles.row}>
                                <View style={styles.left}>
                                    <AppText variant="titleMd" numberOfLines={1}>
                                        {h.itemName}
                                    </AppText>
                                    <AppText
                                        variant="caption"
                                        tone="tertiary"
                                        numberOfLines={1}
                                        style={styles.metaSub}>
                                        마지막 {h.lastPurchaseDate} · {h.lastQuantity.toLocaleString()}
                                        {h.unit ? h.unit : ''}
                                    </AppText>
                                </View>
                                <View style={styles.right}>
                                    <View style={[styles.cycle, {backgroundColor: c.brandPrimarySoft}]}>
                                        <Ionicons name="repeat-outline" size={14} color={c.brandPrimary} />
                                        <AppText variant="caption" tone="brand" weight="800" style={styles.cycleText}>
                                            평균 {Math.round(h.avgIntervalDays)}일
                                        </AppText>
                                    </View>
                                    <AppText variant="caption" tone="tertiary" style={styles.count}>
                                        {h.purchaseCount}회 매입
                                    </AppText>
                                </View>
                            </View>
                        </AppCard>
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
    },
    noticeText: {flex: 1},
    title: {marginTop: spacing.xs},
    subtitle: {marginTop: spacing.xs},
    empty: {marginTop: spacing.huge},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    left: {flex: 1, minWidth: 0},
    metaSub: {marginTop: spacing.xs},
    right: {flexShrink: 0, alignItems: 'flex-end', gap: spacing.xs},
    cycle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.pill,
    },
    cycleText: {marginLeft: 2},
    count: {marginTop: 2},
});
