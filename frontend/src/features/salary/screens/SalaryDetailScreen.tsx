import {AppToast, AppCard, AppHeader, AppListItem, AppText, ErrorState, LoadingState, MoneyCard, ScreenContainer} from '../../../common/components/ds';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import payrollService, {PayrollDetails} from '../services/payrollService';
import {formatMoney} from '../../../common/utils/format';
import {spacing} from '../../../theme/tokens';

interface RouteParams {
    payrollId?: number | null;
}

interface Props {
    route?: {params?: RouteParams};
}

/**
 * 29 SalaryDetail — 확정 시안.
 * 급여 요약(MoneyCard) + 상세 항목 리스트. 로딩/에러/빈/성공 상태 + testID 보존.
 */
const SalaryDetailScreen: React.FC<Props> = ({route}) => {
    const payrollId = route?.params?.payrollId ?? null;

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

    return (
        <ScreenContainer scroll header={header} testID="salary-detail-success">
            {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
            {details.totalPay != null ? (
                <MoneyCard
                    label={`근로자 ${details.employeeId} · 매장 ${details.storeId}`}
                    value={formatMoney(details.totalPay)}
                    sub={details.period ? `${details.period.startDate} ~ ${details.period.endDate}` : undefined}
                />
            ) : null}

            <AppCard variant="flat" style={styles.summary}>
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {details.totalHours != null ? (
                    <Row label="총 근무시간" value={`${details.totalHours}h`} />
                ) : null}
                {/* eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined */}
                {details.totalPay != null ? <Row label="총 급여" value={formatMoney(details.totalPay)} /> : null}
            </AppCard>

            <AppText variant="titleMd" style={styles.subtitle}>상세 항목</AppText>
            {items.length === 0 ? (
                <AppText variant="caption" tone="tertiary" center style={styles.empty}>상세 항목이 없어요.</AppText>
            ) : (
                <View style={styles.list}>
                    {items.map((it, idx) => (
                        <AppListItem
                            key={idx}
                            title={String(it.date)}
                            subtitle={`${it.hours}h`}
                            right={<AppText variant="titleMd">{formatMoney(Number(it.pay) || 0)}</AppText>}
                        />
                    ))}
                </View>
            )}
        </ScreenContainer>
    );
};

const Row: React.FC<{label: string; value: string}> = ({label, value}) => (
    <View style={styles.row}>
        <AppText variant="bodyMd" tone="secondary">{label}</AppText>
        <AppText variant="bodyMd" weight="700">{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    summary: {marginTop: spacing.md},
    row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6},
    subtitle: {marginTop: spacing.lg, marginBottom: spacing.sm},
    list: {gap: spacing.sm},
    empty: {paddingVertical: spacing.lg},
});

export default SalaryDetailScreen;
