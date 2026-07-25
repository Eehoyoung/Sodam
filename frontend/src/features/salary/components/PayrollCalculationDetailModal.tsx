/**
 * 67 계산 근거(PayrollCalculationDetail) — 독립 모달.
 *
 * ⚠️ 계산 로직 신규 작성 금지: 여기서 보여주는 숫자는 전부 SalaryDetailScreen 이 이미
 * GET /api/payroll/{payrollId}/details 로 받아온 PayrollDetailItem[] 필드(regularWage 등)의
 * 단순 합계다. 새 공식을 만들지 않는다 — 세금/주휴수당처럼 BE 응답에 없는 필드는 표시하지 않는다
 * (RawPayrollDto 에 netWage 만 있고 gross/tax breakdown 이 없음, WP-06 조사 결과).
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText, BottomSheet, MoneyCard} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import {formatMoney} from '../../../common/format/money';
import type {PayrollDetailItem, PayrollSummary} from '../services/payrollService';

interface Props {
    visible: boolean;
    onClose: () => void;
    summary: PayrollSummary | null;
    items: PayrollDetailItem[];
}

const sum = (items: PayrollDetailItem[], key: keyof PayrollDetailItem): number =>
    items.reduce((s, it) => s + (Number(it[key]) || 0), 0);

export const PayrollCalculationDetailModal: React.FC<Props> = ({visible, onClose, summary, items}) => {
    const c = useThemeColors();

    const breakdown = useMemo(() => {
        const regularHours = sum(items, 'regularHours');
        const regularWage = sum(items, 'regularWage');
        const overtimeHours = sum(items, 'overtimeHours');
        const overtimeWage = sum(items, 'overtimeWage');
        const nightWorkHours = sum(items, 'nightWorkHours');
        const nightWorkWage = sum(items, 'nightWorkWage');
        // 기간 내 시급이 바뀌지 않았다는 전제하에 첫 근무일 값을 대표로 표시(정보 카드일 뿐, 급여 계산에는 미사용).
        const baseHourlyWage = items.find(it => (it.baseHourlyWage ?? 0) > 0)?.baseHourlyWage;
        return {regularHours, regularWage, overtimeHours, overtimeWage, nightWorkHours, nightWorkWage, baseHourlyWage};
    }, [items]);

    if (!summary) {
        return null;
    }

    const periodLabel = summary.period ? `${summary.period.startDate} ~ ${summary.period.endDate}` : undefined;

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="계산 근거"
            scrollable
            primary={{label: '확인', onPress: onClose}}>
            <View style={styles.body}>
                <MoneyCard
                    label={`${summary.employeeName ?? summary.employeeId} · ${periodLabel ?? ''}`}
                    // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                    value={summary.totalPay != null ? formatMoney(summary.totalPay) : '-'}
                    style={styles.money}
                />

                <Row
                    label="기본 근무"
                    sub={
                        breakdown.baseHourlyWage
                            ? `${breakdown.regularHours.toFixed(1)}h × ${formatMoney(breakdown.baseHourlyWage)}`
                            : `${breakdown.regularHours.toFixed(1)}h`
                    }
                    value={formatMoney(breakdown.regularWage)}
                />
                {breakdown.overtimeHours > 0 ? (
                    <Row label="연장근무" sub={`${breakdown.overtimeHours.toFixed(1)}h`} value={formatMoney(breakdown.overtimeWage)} />
                ) : null}
                {breakdown.nightWorkHours > 0 ? (
                    <Row label="야간근무" sub={`${breakdown.nightWorkHours.toFixed(1)}h`} value={formatMoney(breakdown.nightWorkWage)} />
                ) : null}

                <View style={[styles.divider, {backgroundColor: c.divider}]} />
                <Row
                    label="실수령액"
                    sub={summary.status ? '소담 정산 기준' : undefined}
                    // eslint-disable-next-line eqeqeq -- intentional != null: matches both null and undefined
                    value={summary.totalPay != null ? formatMoney(summary.totalPay) : '-'}
                    highlight
                />

                <AppText variant="caption" tone="tertiary" style={styles.note}>
                    세금·주휴수당 등 추가 공제/가산 내역은 급여 지급 내역서 PDF에서 확인할 수 있어요.
                </AppText>
            </View>
        </BottomSheet>
    );
};

const Row: React.FC<{label: string; sub?: string; value: string; highlight?: boolean}> = ({label, sub, value, highlight}) => (
    <View style={styles.row}>
        <View style={styles.rowLabel}>
            <AppText variant={highlight ? 'titleMd' : 'bodyMd'} weight={highlight ? '700' : '600'}>{label}</AppText>
            {sub ? <AppText variant="caption" tone="tertiary">{sub}</AppText> : null}
        </View>
        <AppText variant={highlight ? 'titleMd' : 'bodyMd'} weight="700" tone={highlight ? 'brand' : 'primary'}>{value}</AppText>
    </View>
);

const styles = StyleSheet.create({
    body: {gap: spacing.xs, paddingBottom: spacing.sm},
    money: {marginBottom: spacing.md},
    row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md},
    rowLabel: {flexShrink: 1, gap: 2},
    divider: {height: 1, marginVertical: spacing.xs},
    note: {marginTop: spacing.sm, lineHeight: 16},
});

export default PayrollCalculationDetailModal;
