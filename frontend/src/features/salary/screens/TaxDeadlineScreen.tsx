import React, {useCallback, useEffect, useState} from 'react';
import {Linking, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    AppButton,
    AppCard,
    AppHeader,
    AppText,
    ErrorState,
    HeroNumber,
    LoadingState,
    ScreenContainer,
} from '../../../common/components/ds';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing, radius} from '../../../theme/tokens';
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
 * B6 세금 신고 기한 — 이번 달 원천세(익월 10일) D-day + 부가세 분기 기한 안내.
 *
 * <p>요약·기한 알림까지만(신고·납부는 홈택스 위임). 추정치이므로 면책 동반.
 */
const TaxDeadlineScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<Route>();
    const c = useThemeColors();
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

    const withholdingUrgent = withholding !== null && withholding !== undefined && withholding.daysUntilDue <= 5;

    return (
        <ScreenContainer
            scroll
            header={<AppHeader title="세금 신고 기한" onBack={() => navigation.goBack()} />}
            footer={
                <AppButton
                    label="홈택스에서 신고하기"
                    variant="secondary"
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
                    <HeroNumber
                        label={`${withholding.month}월분 원천세 신고`}
                        value={ddayLabel(withholding.daysUntilDue)}
                        sub={`${fmtDate(withholding.dueDate)}까지`}
                        accent={withholdingUrgent}
                    />

                    <AppCard variant="flat" style={styles.card}>
                        <View style={styles.row}>
                            <AppText variant="caption" tone="secondary">원천징수세액(추정)</AppText>
                            <AppText variant="titleMd" numberOfLines={1} adjustsFontSizeToFit>
                                {won(withholding.totalWithheld)}
                            </AppText>
                        </View>
                        <View style={styles.row}>
                            <AppText variant="caption" tone="secondary">신고 기한</AppText>
                            <AppText variant="bodyMd">{fmtDate(withholding.dueDate)}</AppText>
                        </View>
                        <AppText variant="caption" tone="tertiary" style={styles.note}>
                            {withholding.disclaimer}
                        </AppText>
                    </AppCard>

                    <AppText variant="caption" tone="secondary" style={styles.sectionLabel}>
                        부가가치세 분기 기한
                    </AppText>
                    <AppCard variant="flat" style={styles.card}>
                        <View style={styles.vatHeader}>
                            <View
                                style={[
                                    styles.iconWrap,
                                    {backgroundColor: c.brandPrimarySoft},
                                ]}>
                                <Ionicons name="calendar-outline" size={20} color={c.brandPrimary} />
                            </View>
                            <View style={styles.flex}>
                                <AppText variant="titleMd">{vat.quarter}</AppText>
                                <AppText variant="caption" tone="secondary">
                                    {fmtDate(vat.dueDate)} · {ddayLabel(vat.daysUntilDue)}
                                </AppText>
                            </View>
                        </View>
                        <AppText variant="caption" tone="secondary" style={styles.guidance}>
                            {vat.guidance}
                        </AppText>
                        <AppText variant="caption" tone="tertiary" style={styles.note}>
                            {vat.disclaimer}
                        </AppText>
                    </AppCard>
                </View>
            )}
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    card: {marginTop: spacing.lg, gap: spacing.xs},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs},
    sectionLabel: {marginTop: spacing.xl, marginBottom: spacing.xs},
    vatHeader: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flex: {flex: 1},
    guidance: {marginTop: spacing.sm},
    note: {marginTop: spacing.sm},
});

export default TaxDeadlineScreen;
