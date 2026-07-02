import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchWeeklyInsights, WeeklyInsights} from '../services/insightsService';

type InsightsRoute = RouteProp<{Insights: {storeId: number}}, 'Insights'>;

const ICON: Record<string, string> = {
    STORE_CREATED: 'storefront-outline',
    PAYROLL_PREVIEW_VIEWED: 'calculator-outline',
    PURCHASE_SAVED: 'receipt-outline',
    EMPLOYEE_REGISTERED: 'person-add-outline',
    PAYSLIP_ISSUED: 'document-text-outline',
    SUBSCRIPTION_STARTED: 'card-outline',
};

/**
 * A6 사장용 주간 인사이트 — 최근 7일 매장 활동 요약(퍼널 계측 집계).
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
                    <HeroNumber
                        label="최근 7일 활동"
                        value={`${total}건`}
                        sub="매장에서 일어난 주요 활동 수예요"
                        accent
                    />
                    <View style={styles.list}>
                        {data?.items.map(it => (
                            <AppCard key={it.eventType} variant="flat">
                                <View style={styles.row}>
                                    <View style={[styles.iconWrap, {backgroundColor: c.surfaceMuted}]}>
                                        <Ionicons
                                            name={ICON[it.eventType] ?? 'ellipse-outline'}
                                            size={20}
                                            color={c.textSecondary}
                                        />
                                    </View>
                                    <AppText variant="bodyMd" style={styles.flex}>{it.label}</AppText>
                                    <AppText variant="titleMd" style={{color: it.count > 0 ? c.brandPrimary : c.textTertiary}}>
                                        {it.count}
                                    </AppText>
                                </View>
                            </AppCard>
                        ))}
                    </View>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    iconWrap: {width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
    flex: {flex: 1},
});

export default WeeklyInsightsScreen;
