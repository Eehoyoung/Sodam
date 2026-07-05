/**
 * 근로계약서 근로조건 요약 카드 — 직원 열람·서명 화면 공용.
 * 근로기준법 §17 필수 기재사항(A) + 근로형태별 추가사항(B) + 실무표준(C) 을 읽기 쉬운 섹션으로 표시한다.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppBadge, AppCard, AppText} from '../../../common/components/ds';
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

const WEEKDAY_SCHEDULE: Array<{key: keyof Pick<LaborContract, 'monHours' | 'tueHours' | 'wedHours' | 'thuHours' | 'friHours' | 'satHours' | 'sunHours'>; label: string}> = [
    {key: 'monHours', label: '월'},
    {key: 'tueHours', label: '화'},
    {key: 'wedHours', label: '수'},
    {key: 'thuHours', label: '목'},
    {key: 'friHours', label: '금'},
    {key: 'satHours', label: '토'},
    {key: 'sunHours', label: '일'},
];

function dash(v: string | null | undefined): string {
    return v && v.trim().length > 0 ? v : '-';
}

function fmtTime(v: string | null): string {
    if (!v) {return '-';}
    // BE LocalTime → 'HH:mm:ss' or 'HH:mm'
    return v.slice(0, 5);
}

function won(v: number | null | undefined): string {
    return v !== null && v !== undefined ? `${v.toLocaleString('ko-KR')}원` : '-';
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

const SectionTitle: React.FC<{children: string}> = ({children}) => (
    <AppText variant="caption" tone="tertiary" weight="800" style={styles.sectionTitle}>
        {children}
    </AppText>
);

export const ContractTermsCard: React.FC<{contract: LaborContract}> = ({contract}) => {
    const c = useThemeColors();

    const periodLabel = contract.periodType === 'FIXED_TERM' ? '기간제' : '기간의 정함 없음';
    const period =
        contract.startDate
            ? `${periodLabel} · ${contract.startDate} ~ ${contract.periodType === 'FIXED_TERM' ? (contract.endDate ?? '-') : '계속'}`
            : periodLabel;
    const isSalary = contract.payType === 'SALARY';
    const payType = isSalary
        ? contract.salaryPayUnit === 'ANNUAL' ? '연봉제' : '월급제'
        : '시급제';
    const wage = contract.hourlyWage !== null ? `${contract.hourlyWage.toLocaleString('ko-KR')}원` : '-';
    const fixedAllowanceTotal =
        (contract.fixedOvertimePay ?? 0) + (contract.fixedNightPay ?? 0) + (contract.fixedHolidayPay ?? 0);
    const payDay = contract.wagePaymentDay !== null ? `매월 ${contract.wagePaymentDay}일` : '-';
    const payMethod = contract.wagePaymentMethod === 'CASH' ? '현금'
        : contract.wagePaymentMethod === 'BANK_TRANSFER' ? '계좌이체' : '-';
    const hours =
        contract.contractedHoursPerWeek !== null ? `주 ${contract.contractedHoursPerWeek}시간` : '-';
    const workTime = contract.workStartTime && contract.workEndTime
        ? `${fmtTime(contract.workStartTime)} ~ ${fmtTime(contract.workEndTime)}${contract.breakMinutes ? ` (휴게 ${contract.breakMinutes}분)` : ''}`
        : '-';
    const holiday = contract.weeklyAllowanceApplicable
        ? (contract.weeklyHolidayDay ? (WEEKDAY_KO[contract.weeklyHolidayDay] ?? contract.weeklyHolidayDay) : '-')
        : '주 15시간 미만 — 주휴 미적용';
    const annualLeave = contract.weeklyAllowanceApplicable
        ? contract.fiveOrMoreEmployeesSnapshot === false
            ? '5인 미만 — 연차유급휴가 미적용'
            : dash(contract.annualLeaveNote)
        : '주 15시간 미만 — 연차유급휴가 미적용';

    const scheduleEntries = WEEKDAY_SCHEDULE.map(d => ({...d, value: contract[d.key]}))
        .filter(d => d.value !== null && d.value !== undefined);

    const insuranceOn: string[] = [];
    if (contract.employmentInsurance) {insuranceOn.push('고용보험');}
    if (contract.industrialAccidentInsurance) {insuranceOn.push('산재보험');}
    if (contract.nationalPension) {insuranceOn.push('국민연금');}
    if (contract.healthInsurance) {insuranceOn.push('건강보험');}

    return (
        <View style={styles.wrap}>
            {!contract.minimumWageCompliant ? (
                <AppCard variant="danger">
                    <AppText variant="bodyMd" weight="800" tone="warning">
                        ⚠ 최저임금 미달 가능성
                    </AppText>
                    <AppText variant="caption" tone="secondary" style={styles.warnSub}>
                        {contract.minimumWageReferenceYear}년 최저임금은 시간당 {contract.minimumWageReferenceValue.toLocaleString('ko-KR')}원이에요.
                        수습 감액(§5②) 등 예외가 아니라면 시급을 확인해 주세요.
                    </AppText>
                </AppCard>
            ) : null}

            <AppCard variant="flat">
                <SectionTitle>계약 기본</SectionTitle>
                <TermRow label="계약 구분" value={period} />
                <TermRow label="취업 장소" value={dash(contract.workLocation)} />
                <TermRow label="담당 업무" value={dash(contract.jobDescription)} last />
            </AppCard>

            <AppCard variant="flat">
                <SectionTitle>임금</SectionTitle>
                <TermRow label="임금 유형" value={payType} />
                {isSalary ? (
                    <>
                        <TermRow label="월 기본급" value={won(contract.monthlyBaseSalary)} />
                        <TermRow label="연봉 환산" value={won(contract.annualSalary)} />
                        <TermRow label="통상시급" value={won(contract.ordinaryHourlyWage)} />
                        <TermRow label="고정 연장수당" value={won(contract.fixedOvertimePay)} />
                        <TermRow label="고정 야간수당" value={won(contract.fixedNightPay)} />
                        <TermRow label="고정 휴일수당" value={won(contract.fixedHolidayPay)} />
                        <TermRow label="고정수당 합계" value={won(fixedAllowanceTotal)} />
                        <TermRow label="예상 월 지급액" value={won(contract.expectedMonthlyWage)} />
                    </>
                ) : (
                    <TermRow label="시급" value={wage} />
                )}
                <TermRow label="지급방법" value={payMethod} />
                <TermRow label="지급일" value={payDay} />
                <TermRow label="구성항목·계산방법" value={dash(contract.wageComponents)} last />
            </AppCard>

            <AppCard variant="flat">
                <SectionTitle>근로시간·휴일</SectionTitle>
                <TermRow label="소정근로시간" value={hours} />
                <TermRow label="근무시간(시업~종업)" value={workTime} />
                <TermRow label="주휴일" value={holiday} />
                <TermRow label="연차휴가" value={annualLeave} last={scheduleEntries.length === 0} />
                {scheduleEntries.length > 0 ? (
                    <View style={styles.scheduleWrap}>
                        <AppText variant="caption" tone="secondary" style={styles.scheduleLabel}>
                            요일별 근로시간(단시간근로자)
                        </AppText>
                        <View style={styles.scheduleRow}>
                            {scheduleEntries.map(d => (
                                <View key={d.key} style={[styles.scheduleChip, {backgroundColor: c.surfaceMuted}]}>
                                    <AppText variant="caption" tone="secondary">{d.label}</AppText>
                                    <AppText variant="bodyMd" weight="700">{d.value}h</AppText>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : null}
            </AppCard>

            {contract.probation ? (
                <AppCard variant="flat">
                    <SectionTitle>수습</SectionTitle>
                    <TermRow label="수습기간" value={contract.probationMonths ? `${contract.probationMonths}개월` : '-'} />
                    <TermRow
                        label="수습 중 임금"
                        value={contract.probationWageRate ? `최저임금의 ${Math.round(contract.probationWageRate * 100)}%` : '-'}
                    />
                    <TermRow label="업무 구분" value={contract.simpleLabor ? '단순노무직' : '비단순노무직'} last />
                </AppCard>
            ) : null}

            <AppCard variant="flat">
                <SectionTitle>4대보험 적용</SectionTitle>
                <View style={styles.insuranceRow}>
                    {(['고용보험', '산재보험', '국민연금', '건강보험'] as const).map(name => (
                        <AppBadge
                            key={name}
                            label={name}
                            tone={insuranceOn.includes(name) ? 'success' : 'neutral'}
                        />
                    ))}
                </View>
            </AppCard>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {gap: spacing.sm},
    warnSub: {marginTop: spacing.xs},
    sectionTitle: {marginBottom: spacing.xs, letterSpacing: 0.4},
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
    scheduleWrap: {marginTop: spacing.sm},
    scheduleLabel: {marginBottom: spacing.xs},
    scheduleRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    scheduleChip: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: 10,
        minWidth: 44,
    },
    insuranceRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
});

export default ContractTermsCard;
