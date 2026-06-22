/**
 * 근로계약서 근로조건 요약 카드 — 직원 열람·서명 화면 공용.
 * 근로기준법 §17 필수 기재사항을 읽기 쉬운 행으로 표시한다.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppCard, AppText} from '../../../common/components/ds';
import {spacing} from '../../../theme/tokens';
import {useThemeColors} from '../../../common/hooks/useThemeColors';
import type {LaborContract} from '../types';

const WEEKDAY_KO: Record<string, string> = {
    MONDAY: '월요일',
    TUESDAY: '화요일',
    WEDNESDAY: '수요일',
    THURSDAY: '목요일',
    FRIDAY: '금요일',
    SATURDAY: '토요일',
    SUNDAY: '일요일',
};

function dash(v: string | null | undefined): string {
    return v && v.trim().length > 0 ? v : '-';
}

const TermRow: React.FC<{label: string; value: string; last?: boolean}> = ({label, value, last}) => {
    const c = useThemeColors();
    return (
        <View style={[styles.row, {borderBottomColor: c.divider}, last && styles.rowLast]}>
            <AppText variant="caption" tone="secondary">{label}</AppText>
            <AppText variant="titleMd" style={styles.value}>{value}</AppText>
        </View>
    );
};

export const ContractTermsCard: React.FC<{contract: LaborContract}> = ({contract}) => {
    const period =
        contract.startDate
            ? `${contract.startDate} ~ ${contract.endDate ?? '기간의 정함 없음'}`
            : '-';
    const wage = contract.hourlyWage !== null ? `${contract.hourlyWage.toLocaleString('ko-KR')}원` : '-';
    const payDay = contract.wagePaymentDay !== null ? `매월 ${contract.wagePaymentDay}일` : '-';
    const hours =
        contract.contractedHoursPerWeek !== null ? `주 ${contract.contractedHoursPerWeek}시간` : '-';
    const holiday = contract.weeklyHolidayDay
        ? (WEEKDAY_KO[contract.weeklyHolidayDay] ?? contract.weeklyHolidayDay)
        : '-';

    return (
        <AppCard variant="flat">
            <TermRow label="계약 기간" value={period} />
            <TermRow label="시급" value={wage} />
            <TermRow label="임금 지급일" value={payDay} />
            <TermRow label="소정근로시간" value={hours} />
            <TermRow label="주휴일" value={holiday} />
            <TermRow label="취업 장소" value={dash(contract.workLocation)} />
            <TermRow label="담당 업무" value={dash(contract.jobDescription)} />
            <TermRow label="연차휴가" value={dash(contract.annualLeaveNote)} last />
        </AppCard>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1,
        gap: spacing.md,
    },
    rowLast: {borderBottomWidth: 0},
    value: {flexShrink: 1, textAlign: 'right'},
});

export default ContractTermsCard;
