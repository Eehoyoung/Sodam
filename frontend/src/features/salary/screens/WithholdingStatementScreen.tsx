import React, {useCallback, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {fetchWithholdingStatement, WithholdingStatement} from '../services/taxStatementService';

type Route = RouteProp<{S: {storeId: number}}, 'S'>;

const HOMETAX_URL = 'https://www.hometax.go.kr';
const won = (n: number) => `${n.toLocaleString()}원`;
const THIS_YEAR = new Date().getFullYear();

/**
 * A2 세무 자료 — 간이지급명세서 인별 연간 집계. 자료정리까지만(신고는 홈택스 위임).
 */
const WithholdingStatementScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId} = route.params;

    const [tab, setTab] = useState(0); // 0 올해 1 작년
    const year = tab === 0 ? THIS_YEAR : THIS_YEAR - 1;

    const [data, setData] = useState<WithholdingStatement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            setData(await fetchWithholdingStatement(storeId, year));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, year]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세무 자료" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="홈택스에서 제출하기"
                    variant="secondary"
                    onPress={() => Linking.openURL(HOMETAX_URL)}
                />
            }>
            <SegmentedControl options={[`${THIS_YEAR}년`, `${THIS_YEAR - 1}년`]} value={tab} onChange={setTab} />

            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="자료를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : !data || data.employeeCount === 0 ? (
                <EmptyState
                    title="집계할 급여가 없어요"
                    description={`${year}년에 발급된 급여 명세가 있으면 인별 지급명세서 자료를 만들어드려요.`}
                />
            ) : (
                <View>
                    <HeroNumber
                        label={`${year}년 원천징수세액`}
                        value={won(data.totalWithheld)}
                        sub={`직원 ${data.employeeCount}명 · 지급총액 ${won(data.totalPaid)}`}
                        accent
                    />
                    <View style={styles.list}>
                        {data.items.map(it => (
                            <AppCard key={it.employeeId} variant="flat">
                                <AppText variant="titleMd">{it.employeeName}</AppText>
                                <View style={styles.row}>
                                    <AppText variant="caption" tone="secondary">지급총액</AppText>
                                    <AppText variant="bodyMd" numberOfLines={1} adjustsFontSizeToFit>
                                        {won(it.paidTotal)}
                                    </AppText>
                                </View>
                                <View style={styles.row}>
                                    <AppText variant="caption" tone="secondary">원천징수</AppText>
                                    <AppText variant="bodyMd" numberOfLines={1} adjustsFontSizeToFit>
                                        {won(it.withheldTotal)}
                                    </AppText>
                                </View>
                            </AppCard>
                        ))}
                    </View>
                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs},
    disclaimer: {marginTop: spacing.md},
});

export default WithholdingStatementScreen;
