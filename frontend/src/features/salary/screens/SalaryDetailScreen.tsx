import {AppToast, AppButton, AppCard, AppHeader, AppText, CtaStack, ErrorState, HeroNumber, LoadingState, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {Share, StyleSheet, View} from 'react-native';
import payrollService, {PayrollDetails} from '../services/payrollService';
import {formatMoney} from '../../../common/utils/format';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {spacing} from '../../../theme/tokens';

interface RouteParams {
    payrollId?: number | null;
}

interface Props {
    route?: {params?: RouteParams};
}

/**
 * 29 SalaryDetail — v3 토스식.
 * 실수령액(HeroNumber) + 상세 항목 리스트. 하단 CTA(명세서 공유). 상태/ testID 보존.
 */
const SalaryDetailScreen: React.FC<Props> = ({route}) => {
    const payrollId = route?.params?.payrollId ?? null;
    const c = useThemeColors();

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<PayrollDetails | null>(null);

    useEffect(() => {
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
                const res = await payrollService.getDetails(payrollId);
                if (!mounted) {
                    return;
                }
                setDetails(res ?? null);
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
    }, [payrollId]);

    const header = <AppHeader title="급여 상세" />;

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
    if (!details) {
        return (
            <ScreenContainer header={header} testID="salary-detail-empty">
                <ErrorState glyph="∅" title="표시할 데이터가 없어요" />
            </ScreenContainer>
        );
    }

    const items = details.items ?? [];
    const periodLabel = details.period ? `${details.period.startDate} ~ ${details.period.endDate}` : undefined;

    const handleShare = () => {
        // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
        const total = details.totalPay != null ? formatMoney(details.totalPay) : '-';
        Share.share({
            message: `[소담] 급여 명세서\n근로자 ${details.employeeId} · 매장 ${details.storeId}\n${periodLabel ?? ''}\n실수령액 ${total}`.trim(),
        }).catch(() => undefined);
    };

    return (
        <ScreenContainer
            scroll
            header={header}
            testID="salary-detail-success"
            footer={
                <CtaStack bordered>
                    <AppButton label="명세서 공유하기" onPress={handleShare} />
                </CtaStack>
            }>
            <View style={styles.heroBlock}>
                <HeroNumber
                    label={`근로자 ${details.employeeId} · 매장 ${details.storeId}`}
                    // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                    value={details.totalPay != null ? formatMoney(details.totalPay) : '-'}
                    sub={periodLabel}
                    accent
                />
            </View>

            <AppCard variant="warm" style={styles.summary}>
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {details.totalHours != null ? (
                    <Row label="총 근무시간" value={`${details.totalHours}h`} />
                ) : null}
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {details.totalPay != null ? <Row label="실수령액" value={formatMoney(details.totalPay)} highlight /> : null}
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
                                idx < items.length - 1 ? {borderBottomWidth: 1, borderBottomColor: c.divider} : null,
                            ]}>
                            <View style={styles.itemLabel}>
                                <AppText variant="bodyMd" weight="600" numberOfLines={1}>{String(it.date)}</AppText>
                                <AppText variant="caption" tone="tertiary">{it.hours}h</AppText>
                            </View>
                            <AppText variant="titleMd" weight="700" numberOfLines={1} style={styles.itemValue}>
                                {formatMoney(Number(it.pay) || 0)}
                            </AppText>
                        </View>
                    ))}
                </AppCard>
            )}
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
    heroBlock: {paddingTop: spacing.sm, paddingBottom: spacing.xl},
    summary: {marginBottom: spacing.xxl, gap: spacing.xs},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6},
    subtitle: {marginBottom: spacing.md},
    itemsCard: {paddingVertical: spacing.xs},
    itemRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md},
    itemLabel: {flexShrink: 1, gap: 2},
    itemValue: {flexShrink: 0},
    empty: {paddingVertical: spacing.xl},
});

export default SalaryDetailScreen;
