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
import {fetchHeadcountTrend, HeadcountTrend} from '../services/employmentCreditService';

type Route = RouteProp<{H: {storeId: number}}, 'H'>;

const MONTH_LABEL = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const THIS_YEAR = new Date().getFullYear();

/**
 * A3 상시근로자 월별 추이 — 고용세액공제(고용 증가) 신호. 추정·세무사 검토 전.
 */
const HeadcountTrendScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
    const {storeId} = route.params;

    const [data, setData] = useState<HeadcountTrend | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchHeadcountTrend(storeId, THIS_YEAR));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        load();
    }, [load]);

    const maxCount = data ? Math.max(1, ...data.monthly.map(m => m.headcount)) : 1;

    return (
        <ScreenContainer scroll header={<AppHeader title="고용 공제 신호" onBack={() => navigation.goBack()} />}>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : data ? (
                <View>
                    <HeroNumber
                        label={`${data.year}년 평균 상시근로자`}
                        value={`${data.averageHeadcount}명`}
                        sub={`전년 평균 ${data.priorYearAverage}명`}
                        accent={data.increasedVsPriorYear}
                    />

                    <AppCard variant={data.increasedVsPriorYear ? 'elevated' : 'flat'} style={styles.signal}>
                        <View style={styles.signalRow}>
                            <Ionicons
                                name={data.increasedVsPriorYear ? 'trending-up' : 'remove-outline'}
                                size={22}
                                color={data.increasedVsPriorYear ? c.success : c.textTertiary}
                            />
                            <AppText variant="titleMd" style={styles.flex}>
                                {data.increasedVsPriorYear
                                    ? '고용이 늘었어요 — 고용세액공제 대상일 수 있어요'
                                    : '전년 대비 증가가 확인되지 않았어요'}
                            </AppText>
                        </View>
                    </AppCard>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>월별 추이</AppText>
                    <AppCard variant="flat">
                        {data.monthly.map(m => (
                            <View key={m.month} style={styles.barRow}>
                                <AppText variant="caption" tone="tertiary" style={styles.month}>
                                    {MONTH_LABEL[m.month - 1]}
                                </AppText>
                                <View style={[styles.track, {backgroundColor: c.surfaceMuted}]}>
                                    <View
                                        style={[
                                            styles.fill,
                                            {
                                                backgroundColor: c.brandPrimary,
                                                width: `${(m.headcount / maxCount) * 100}%`,
                                            },
                                        ]}
                                    />
                                </View>
                                <AppText variant="caption" style={styles.count}>{m.headcount}</AppText>
                            </View>
                        ))}
                    </AppCard>

                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    signal: {marginTop: spacing.lg},
    signalRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    flex: {flex: 1},
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    barRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs},
    month: {width: 32},
    track: {flex: 1, height: 10, borderRadius: 5, overflow: 'hidden'},
    fill: {height: 10, borderRadius: 5},
    count: {width: 20, textAlign: 'right'},
    disclaimer: {marginTop: spacing.md},
});

export default HeadcountTrendScreen;
