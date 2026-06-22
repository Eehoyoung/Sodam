import React, {useCallback, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppBadge,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {fetchSubsidyEligibility, SubsidyEligibility} from '../services/subsidyService';

type Route = RouteProp<{S: {storeId: number}}, 'S'>;

const DURUNURI_URL = 'https://www.gov.kr';
const won = (n?: number | null) => (typeof n === 'number' ? `${n.toLocaleString()}원` : '—');

/**
 * B7 두루누리·고용지원금 자격 — 사장 지원금 신호. 신청은 정부24·근로복지공단 위임.
 */
const SubsidyEligibilityScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId} = route.params;

    const [data, setData] = useState<SubsidyEligibility | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchSubsidyEligibility(storeId));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="지원금 자격" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="정부24에서 신청 알아보기"
                    variant="secondary"
                    onPress={() => Linking.openURL(DURUNURI_URL)}
                />
            }>
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
                        label="두루누리 지원 가능 직원"
                        value={`${data.eligibleCount}명`}
                        sub={data.storeUnder10
                            ? `전체 ${data.employeeCount}명 · 10인 미만 사업장`
                            : `전체 ${data.employeeCount}명 · 10인 이상은 대상 아님`}
                        accent={data.eligibleCount > 0}
                    />
                    <AppText variant="bodyMd" tone="secondary" style={styles.guidance}>
                        {data.guidance}
                    </AppText>
                    <View style={styles.list}>
                        {data.candidates.map(ca => (
                            <AppCard key={ca.employeeId} variant="flat">
                                <View style={styles.row}>
                                    <View style={styles.flex}>
                                        <AppText variant="titleMd" numberOfLines={1}>{ca.employeeName}</AppText>
                                        <AppText variant="caption" tone="tertiary">
                                            월보수 추정 {won(ca.monthlyWageEstimate)}
                                        </AppText>
                                    </View>
                                    <AppBadge
                                        label={ca.eligible ? '지원 가능' : '대상 아님'}
                                        tone={ca.eligible ? 'success' : 'neutral'}
                                    />
                                </View>
                            </AppCard>
                        ))}
                    </View>
                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            ) : null}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    guidance: {marginTop: spacing.lg},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    flex: {flex: 1},
    disclaimer: {marginTop: spacing.md},
});

export default SubsidyEligibilityScreen;
