import {AppToast, AppButton, AppCard, AppHeader, AppText, CtaStack, ErrorState, HeroNumber, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {HomeStackParamList} from '../../../navigation/HomeNavigator';
import payrollService, {PayrollDetailItem, PayrollSummary} from '../services/payrollService';
import {formatMoney} from '../../../common/format/money';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';
import PayrollCalculationDetailModal from '../components/PayrollCalculationDetailModal';

interface RouteParams {
    payrollId?: number | null;
}

export interface SalaryDetailVisualFixture {
    summary: PayrollSummary;
    items: PayrollDetailItem[];
}

interface Props {
    route?: {params?: RouteParams};
    /** 개발용 시각 검증 전용 — API 호출을 건너뛰고 고정 데이터를 표시한다. */
    visualFixture?: SalaryDetailVisualFixture;
}

/**
 * 29 SalaryDetail — v3 토스식.
 * 실수령액(HeroNumber) + 상세 항목 리스트. 하단 CTA(명세서 공유). 상태/ testID 보존.
 *
 * [FE_BE_SCHEMA_GAP §1-1] GET /api/payroll/{payrollId}/details 는 근무일별 배열(PayrollDetailDto[])만
 * 반환하고 실수령액/기간 같은 요약 필드가 없다. 요약은 GET /api/payroll/{payrollId} 로 별도 조회한다.
 */
const SalaryDetailScreen: React.FC<Props> = ({route, visualFixture}) => {
    const payrollId = route?.params?.payrollId ?? null;
    const c = useThemeColors();
    const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<PayrollSummary | null>(visualFixture?.summary ?? null);
    const [items, setItems] = useState<PayrollDetailItem[]>(visualFixture?.items ?? []);
    const [calcDetailVisible, setCalcDetailVisible] = useState(false);

    useEffect(() => {
        if (visualFixture) {
            return;
        }
        if (!payrollId || typeof payrollId !== 'number' || payrollId <= 0) {
            AppToast.error('잘못된 접근입니다. 급여 ID가 필요합니다.');
            setError('INVALID_PARAM');
            return;
        }
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const [summaryRes, itemsRes] = await Promise.all([
                    payrollService.getById(payrollId),
                    payrollService.getDetails(payrollId),
                ]);
                if (!mounted) {
                    return;
                }
                setSummary(summaryRes ?? null);
                setItems(Array.isArray(itemsRes) ? itemsRes : []);
            } catch (e: any) {
                if (!mounted) {
                    return;
                }
                setError('LOAD_ERROR');
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- visualFixture is a dev-only static prop, not expected to change
    }, [payrollId]);

    const header = <AppHeader title="급여 상세" onBack={() => navigation.goBack()} />;

    if (loading) {
        return (
            <ScreenContainer header={header} testID="salary-detail-loading">
                <LoadingState title="불러오는 중" description="급여 상세를 불러오고 있어요" />
            </ScreenContainer>
        );
    }
    if (error === 'INVALID_PARAM') {
        return (
            <ScreenContainer header={header} testID="salary-detail-invalid">
                <ErrorState title="잘못된 접근이에요" description="급여 정보를 찾을 수 없어요." />
            </ScreenContainer>
        );
    }
    if (error === 'LOAD_ERROR') {
        return (
            <ScreenContainer header={header} testID="salary-detail-error">
                <ErrorState title="불러오지 못했어요" description="급여 상세를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />
            </ScreenContainer>
        );
    }
    if (!summary) {
        return (
            <ScreenContainer header={header} testID="salary-detail-empty">
                <ErrorState glyph="∅" title="표시할 데이터가 없어요" />
            </ScreenContainer>
        );
    }

    const periodLabel = summary.period ? `${summary.period.startDate} ~ ${summary.period.endDate}` : undefined;

    const handleShare = () => {
        // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
        const total = summary.totalPay != null ? formatMoney(summary.totalPay) : '-';
        Share.share({
            message: `[소담] 급여 명세서\n근로자 ${summary.employeeId} · 매장 ${summary.storeId}\n${periodLabel ?? ''}\n실수령액 ${total}`.trim(),
        }).catch(() => undefined);
    };

    const openPreview = () => {
        navigation.navigate('PdfPreview', {
            title: `급여명세서_${summary.employeeId}.pdf`,
            sub: periodLabel,
            onShare: handleShare,
        });
    };

    return (
        <ScreenContainer
            scroll
            header={header}
            testID="salary-detail-success"
            footer={
                <CtaStack bordered>
                    <AppButton label="명세서 미리보기" onPress={openPreview} />
                    <AppButton label="명세서 공유하기" variant="secondary" onPress={handleShare} />
                    <AppButton label="계산 근거 보기" variant="ghost" onPress={() => setCalcDetailVisible(true)} />
                </CtaStack>
            }>
            <View style={styles.heroBlock}>
                <HeroNumber
                    label={`근로자 ${summary.employeeName ?? summary.employeeId} · 매장 ${summary.storeName ?? summary.storeId}`}
                    // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                    value={summary.totalPay != null ? formatMoney(summary.totalPay) : '-'}
                    sub={periodLabel}
                    accent
                />
            </View>

            <AppCard variant="warm" style={styles.summary}>
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {summary.totalHours != null ? (
                    <Row label="총 근무시간" value={`${summary.totalHours}h`} />
                ) : null}
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {summary.totalPay != null ? <Row label="실수령액" value={formatMoney(summary.totalPay)} highlight /> : null}
            </AppCard>

            <AppText variant="titleMd" style={styles.subtitle}>상세 항목</AppText>
            {items.length === 0 ? (
                <AppText variant="caption" tone="tertiary" center style={styles.empty}>상세 항목이 없어요.</AppText>
            ) : (
                <AppCard variant="plain" style={styles.itemsCard}>
                    {items.map((it, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.itemRow,
                                idx < items.length - 1 ? [styles.itemDivider, {borderBottomColor: c.divider}] : null,
                            ]}>
                            <View style={styles.itemLabel}>
                                <AppText variant="bodyMd" weight="600" numberOfLines={1}>{String(it.workDate)}</AppText>
                                <AppText variant="caption" tone="tertiary">{it.totalHours ?? 0}h</AppText>
                            </View>
                            <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.itemValue}>
                                {formatMoney(Number(it.dailyWage) || 0)}
                            </AppText>
                        </View>
                    ))}
                </AppCard>
            )}

            <AppText variant="titleMd" style={styles.calculationBasisTitle}>급여 계산 근거</AppText>
            <AppCard variant="plain" style={styles.calculationBasisCard}>
                <Row label="주간 초과근로 시간" value={`${summary.weeklyOvertimeHours ?? 0}h`} />
                <Row label="주간 초과근로 가산액" value={formatMoney(summary.weeklyOvertimeWage ?? 0)} />
                <Row label="주휴 인정 시간" value={`${summary.weeklyAllowanceHours ?? 0}h`} />
                <Row label="주휴수당" value={formatMoney(summary.weeklyAllowance ?? 0)} />
            </AppCard>

            <PayrollCalculationDetailModal
                visible={calcDetailVisible}
                onClose={() => setCalcDetailVisible(false)}
                summary={summary}
                items={items}
            />
        </ScreenContainer>
    );
};

const Row: React.FC<{label: string; value: string; highlight?: boolean}> = ({label, value, highlight}) => (
    <View style={styles.row}>
        <AppText variant="bodyMd" tone="secondary">{label}</AppText>
        <AppText variant={highlight ? 'titleMd' : 'bodyMd'} weight="700" tone={highlight ? 'brand' : 'primary'}>{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    itemDivider: {borderBottomWidth: 1},
    heroBlock: {paddingTop: spacing.sm, paddingBottom: spacing.xl},
    summary: {marginBottom: spacing.xxl, gap: spacing.xs},
    calculationBasisTitle: {marginTop: spacing.xxl, marginBottom: spacing.md},
    calculationBasisCard: {marginBottom: spacing.xxl, gap: spacing.xs},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6},
    subtitle: {marginBottom: spacing.md},
    itemsCard: {paddingVertical: spacing.xs},
    itemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md},
    itemLabel: {flexShrink: 1, gap: 2},
    itemValue: {flexShrink: 0},
    empty: {paddingVertical: spacing.xl},
});

export default SalaryDetailScreen;
