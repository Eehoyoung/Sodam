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
    LoadingState,
    MoneyCard,
    ScreenContainer,
    SegmentedControl,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import {fetchWithholdingStatement, WithholdingStatement} from '../services/taxStatementService';

type Route = RouteProp<{S: {storeId: number}}, 'S'>;

const HOMETAX_URL = 'https://www.hometax.go.kr';
const won = (n: number) => `${n.toLocaleString()}원`;
const THIS_YEAR = new Date().getFullYear();

/**
 * W6 WithholdingStatementScreen(A2) — v3 시안(sodam-v3-11-taxwage.html) 1:1.
 *
 * 연도 SegmentedControl + MoneyCard(원천징수세액) + 단일 리스트 카드(행마다 하단 구분선,
 * 이름 좌측(지급총액 additive 캡션)·원천징수액 우측) + 하단 아웃라인 CTA "홈택스에서 제출하기".
 * 간이지급명세서 인별 연간 집계. 자료정리까지만(신고는 홈택스 위임).
 */
const WithholdingStatementScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
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
                    <MoneyCard
                        label={`${year}년 원천징수세액`}
                        value={won(data.totalWithheld)}
                        sub={`직원 ${data.employeeCount}명 · 지급총액 ${won(data.totalPaid)}`}
                    />
                    <AppCard variant="plain" style={styles.list}>
                        {data.items.map((it, i, arr) => (
                            <View
                                key={it.employeeId}
                                style={[
                                    styles.row,
                                    i < arr.length - 1 && styles.rowBordered,
                                    i < arr.length - 1 && {borderBottomColor: c.divider},
                                ]}>
                                <View style={styles.rowLeft}>
                                    <AppText variant="bodyMd" tone="secondary" numberOfLines={1}>
                                        {it.employeeName}
                                    </AppText>
                                    <AppText variant="caption" tone="tertiary">
                                        지급총액 {won(it.paidTotal)}
                                    </AppText>
                                </View>
                                <AppText variant="bodyMd" weight="700" numberOfLines={1} adjustsFontSizeToFit>
                                    {won(it.withheldTotal)}
                                </AppText>
                            </View>
                        ))}
                    </AppCard>
                    <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
                        {data.disclaimer}
                    </AppText>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    list: {marginTop: spacing.lg},
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm + 2,
    },
    rowBordered: {borderBottomWidth: 1},
    rowLeft: {flex: 1, minWidth: 0},
    disclaimer: {marginTop: spacing.md},
});

export default WithholdingStatementScreen;
