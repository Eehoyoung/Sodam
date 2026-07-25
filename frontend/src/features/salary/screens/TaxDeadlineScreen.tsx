import React, {useCallback, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    LoadingState,
    MoneyCard,
    ScreenContainer,
} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {
    fetchVatDeadline,
    fetchWithholdingMonthly,
    VatDeadline,
    WithholdingMonthly,
} from '../services/taxMonthlyService';

type Route = RouteProp<{T: {storeId: number}}, 'T'>;

const HOMETAX_URL = 'https://www.hometax.go.kr';
const won = (n: number) => `${n.toLocaleString()}원`;

/** 신고 대상 월 = 직전 달(이번 달 10일까지 전월분 원천세 신고). */
const targetMonth = (): {year: number; month: number} => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {year: d.getFullYear(), month: d.getMonth() + 1};
};

/** D-day 라벨: 남은 일수 → "D-3" / "D-DAY" / "기한 경과". */
const ddayLabel = (days: number): string => {
    if (days > 0) {
        return `D-${days}`;
    }
    if (days === 0) {
        return 'D-DAY';
    }
    return `${-days}일 지남`;
};

const fmtDate = (iso: string): string => {
    const [y, m, d] = iso.split('-');
    return `${y}년 ${Number(m)}월 ${Number(d)}일`;
};

/**
 * W3 TaxDeadlineScreen — v3 시안(sodam-v3-11-taxwage.html) 1:1.
 *
 * MoneyCard(원천세 D-day) + 단일 행(원천징수세액 추정) + section-label "부가가치세 분기 기한" +
 * 단일 행(분기·D-day) + info-card(안내·면책 통합) + 하단 CTA "홈택스에서 신고하기".
 * 요약·기한 알림까지만(신고·납부는 홈택스 위임). 추정치이므로 면책 동반.
 */
const TaxDeadlineScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const {storeId} = route.params;
    const {year, month} = targetMonth();

    const [withholding, setWithholding] = useState<WithholdingMonthly | null>(null);
    const [vat, setVat] = useState<VatDeadline | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [w, v] = await Promise.all([
                fetchWithholdingMonthly(storeId, year, month),
                fetchVatDeadline(storeId),
            ]);
            setWithholding(w);
            setVat(v);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [storeId, year, month]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세금 신고 기한" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="홈택스에서 신고하기"
                    onPress={() => Linking.openURL(HOMETAX_URL)}
                />
            }>
            {loading ? (
                <LoadingState />
            ) : error || !withholding || !vat ? (
                <ErrorState
                    title="기한 정보를 불러오지 못했어요"
                    description="잠시 후 다시 시도해 주세요."
                    primary={{label: '다시 시도', onPress: load}}
                />
            ) : (
                <View>
                    <MoneyCard
                        label={`${withholding.month}월분 원천세 신고`}
                        value={ddayLabel(withholding.daysUntilDue)}
                        sub={`${fmtDate(withholding.dueDate)}까지`}
                    />

                    <View style={styles.row}>
                        <AppText variant="bodyMd" tone="secondary">원천징수세액(추정)</AppText>
                        <AppText variant="bodyMd" weight="700" numberOfLines={1} adjustsFontSizeToFit>
                            {won(withholding.totalWithheld)}
                        </AppText>
                    </View>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        부가가치세 분기 기한
                    </AppText>
                    <View style={styles.row}>
                        <AppText variant="bodyMd" tone="secondary">{vat.quarter}</AppText>
                        <AppText variant="bodyMd" weight="700">{ddayLabel(vat.daysUntilDue)}</AppText>
                    </View>

                    <AppCard variant="flat" style={styles.note}>
                        <AppText variant="caption" tone="tertiary">
                            {vat.guidance} {withholding.disclaimer} {vat.disclaimer}
                        </AppText>
                    </AppCard>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md},
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    note: {marginTop: spacing.lg},
});

export default TaxDeadlineScreen;
