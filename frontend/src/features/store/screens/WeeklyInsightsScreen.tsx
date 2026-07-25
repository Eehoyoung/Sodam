import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchWeeklyInsights, WeeklyInsights} from '../services/insightsService';

type InsightsRoute = RouteProp<{Insights: {storeId: number}}, 'Insights'>;

/**
 * B8 WeeklyInsightsScreen(A6) — v3 시안(sodam-v3-10-business.html) 1:1.
 *
 * MoneyCard(최근 7일 활동) + 단일 리스트 카드(행마다 하단 구분선, 라벨 좌측·건수 우측, 아이콘 없음).
 * 사장용 주간 인사이트 — 최근 7일 매장 활동 요약(퍼널 계측 집계).
 */
const WeeklyInsightsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<InsightsRoute>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [data, setData] = useState<WeeklyInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchWeeklyInsights(storeId, 7));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        load();
    }, [load]);

    const total = data ? data.items.reduce((sum, it) => sum + it.count, 0) : 0;

    return (
        <ScreenContainer scroll header={<AppHeader title="이번 주 인사이트" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="인사이트를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <View>
                    <MoneyCard
                        label="최근 7일 활동"
                        value={`${total}건`}
                        sub="매장에서 일어난 주요 활동 수예요"
                    />
                    <AppCard variant="plain" style={styles.list}>
                        {data?.items.map((it, i, arr) => (
                            <View
                                key={it.eventType}
                                style={[
                                    styles.row,
                                    i < arr.length - 1 && styles.rowBordered,
                                    i < arr.length - 1 && {borderBottomColor: c.divider},
                                ]}>
                                <AppText variant="bodyMd" tone="secondary" style={styles.flex}>
                                    {it.label}
                                </AppText>
                                <AppText
                                    variant="bodyMd"
                                    weight="700"
                                    style={{color: it.count > 0 ? c.brandPrimary : c.textTertiary}}>
                                    {it.count}건
                                </AppText>
                            </View>
                        ))}
                    </AppCard>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.lg},
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.sm + 2,
    },
    rowBordered: {borderBottomWidth: 1},
    flex: {flex: 1},
});

export default WeeklyInsightsScreen;
