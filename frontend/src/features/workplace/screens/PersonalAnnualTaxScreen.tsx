import React, {useCallback, useContext, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
    AmountText,
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    EmptyState,
    ErrorState,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import AuthContext from '../../../contexts/AuthContext';
import {spacing} from '../../../theme/tokens';
import {fetchPersonalAnnualTax, PersonalAnnualTax} from '../services/personalTaxService';

const HOMETAX_URL = 'https://www.hometax.go.kr';
const won = (n: number) => `${n.toLocaleString()}원`;
const THIS_YEAR = new Date().getFullYear();

/**
 * B3 긱워커 연간 사업소득·환급 신호 — 멀티 근무지 3.3% 합산. 신고는 홈택스 위임.
 * 히어로 수치는 AppCard variant="spot"으로 전환 완료
 * (docs/260720/artifacts/sodam-v3-12-notice.html N9 spot-card 대조 반영).
 */
const PersonalAnnualTaxScreen: React.FC = () => {
    const navigation = useNavigation();
    const {user} = useContext(AuthContext);
    const userId = user?.id;

    const [data, setData] = useState<PersonalAnnualTax | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(false);
        try {
            setData(await fetchPersonalAnnualTax(Number(userId), THIS_YEAR));
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="내 환급" onBack={() => navigation.goBack()} />}
            footer={
                data ? (
                    <AppButton
                        label="홈택스에서 환급 알아보기"
                        variant="secondary"
                        onPress={() => Linking.openURL(HOMETAX_URL)}
                    />
                ) : undefined
            }>
            {loading ? (
                <LoadingState />
            ) : error ? (
                <ErrorState
                    title="불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : !data || data.totalIncome === 0 ? (
                <EmptyState
                    title="집계할 소득이 없어요"
                    description={`${THIS_YEAR}년 근무 기록이 쌓이면 떼인 세금과 환급 가능성을 알려드려요.`}
                />
            ) : (
                <View>
                    {/* v3 링&패스: 히어로 숫자를 spot 카드(코랄 테두리)로 감싼다 (아티팩트 N9 spot-card). */}
                    <AppCard variant="spot" style={styles.heroCard}>
                        <AppText variant="titleMd" weight="800">{`${data.year}년 떼인 세금 (환급 가능성)`}</AppText>
                        <AmountText
                            size={28}
                            tone={data.refundPossible ? 'brand' : 'primary'}
                            style={styles.heroValue}>
                            {won(data.withheldEstimate)}
                        </AmountText>
                        <AppText variant="caption" tone="secondary" style={styles.heroSub}>
                            {`연 소득 ${won(data.totalIncome)} · 3.3% 원천징수`}
                        </AppText>
                    </AppCard>
                    <AppText variant="bodyMd" tone="secondary" style={styles.guidance}>
                        {data.guidance}
                    </AppText>
                    <View style={styles.list}>
                        {data.perWorkplace.map(w => (
                            <AppCard key={w.workplaceId} variant="flat">
                                <AppText variant="titleMd" numberOfLines={1}>{w.workplaceName}</AppText>
                                <View style={styles.row}>
                                    <AppText variant="caption" tone="secondary">받은 돈</AppText>
                                    <AppText variant="bodyMd" numberOfLines={1} adjustsFontSizeToFit>{won(w.income)}</AppText>
                                </View>
                                <View style={styles.row}>
                                    <AppText variant="caption" tone="secondary">떼인 세금</AppText>
                                    <AppText variant="bodyMd" numberOfLines={1} adjustsFontSizeToFit>{won(w.withheld)}</AppText>
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
    heroCard: {gap: spacing.xs},
    heroValue: {marginTop: spacing.xs},
    heroSub: {marginTop: spacing.xs},
    guidance: {marginTop: spacing.lg},
    list: {marginTop: spacing.lg, gap: spacing.sm},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs},
    disclaimer: {marginTop: spacing.md},
});

export default PersonalAnnualTaxScreen;
